import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getDb, initDb, closeDb } from './database.mjs';
import { initExchange, getTickers, getOrderBook, getCandles } from './exchange.mjs';
import { setupWebSocket, stopWebSocket, broadcastAll } from './websocket.mjs';
import { placeOrder, cancelOrder, getOrderBookSnapshot } from './matching.mjs';
import staticFiles from '@fastify/static';
import { runMigrations } from './features/migrations.mjs';
import * as P2P from './features/p2p.mjs';
import * as AI from './features/ai-assistant.mjs';
import * as Marketplace from './features/marketplace.mjs';
import * as Social from './features/social.mjs';
import * as WalletProtect from './features/wallet-protect.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5173');
const STATIC_DIR = path.join(__dirname, '..', 'dist');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const API_BASE_URL = process.env.API_BASE_URL || '';
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || '900000');
const REFRESH_EXPIRY = parseInt(process.env.REFRESH_EXPIRY || '604800000');

const app = Fastify({ logger: false, trustProxy: true });

await app.register(cors, {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  credentials: true,
});
await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

function signToken(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + JWT_EXPIRY })).toString('base64url');
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verifyToken(t) {
  try {
    const [h, b, s] = t.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (s !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

async function auth(req, reply) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return reply.status(401).send({ error: 'Unauthorized' });
  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload) return reply.status(401).send({ error: 'Invalid or expired token' });
  req.user = payload;
}

// ── Auth ──
app.post('/api/auth/login', async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'Email and password required' });

  const db = getDb();
  const user = await db('users').where('email', email).first();
  if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

  const at = signToken({ sub: user.id, email: user.email, role: user.role });
  const rt = crypto.randomBytes(32).toString('hex');
  await db('sessions').insert({
    id: `sess-${Date.now()}`, user_id: user.id, refresh_token: rt,
    ip_address: req.ip, user_agent: req.headers['user-agent'] || '',
    expires_at: new Date(Date.now() + REFRESH_EXPIRY),
  });
  await db('users').where('id', user.id).update({ last_login_at: new Date() });

  return {
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, kycStatus: user.kyc_status, tier: user.tier },
    accessToken: at, refreshToken: rt,
  };
});

app.post('/api/auth/register', async (req, reply) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'Email and password required' });

  const db = getDb();
  const existing = await db('users').where('email', email).first();
  if (existing) return reply.status(409).send({ error: 'Email already registered' });

  const id = `user-${Date.now()}`;
  const refCode = `REF${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await db('users').insert({
    id, email, password_hash: password, full_name: fullName || 'User', referral_code: refCode,
  });

  return reply.status(201).send({ user: { id, email, fullName: fullName || 'User', role: 'user', kycStatus: 'none', tier: 'bronze' } });
});

app.post('/api/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return reply.status(400).send({ error: 'Refresh token required' });

  const db = getDb();
  const sess = await db('sessions').where('refresh_token', refreshToken).first();
  if (!sess) return reply.status(401).send({ error: 'Invalid refresh token' });

  await db('sessions').where('id', sess.id).del();
  const user = await db('users').where('id', sess.user_id).first();
  if (!user) return reply.status(401).send({ error: 'User not found' });

  const at = signToken({ sub: user.id, email: user.email, role: user.role });
  const rt = crypto.randomBytes(32).toString('hex');
  await db('sessions').insert({
    id: `sess-${Date.now()}`, user_id: user.id, refresh_token: rt,
    expires_at: new Date(Date.now() + REFRESH_EXPIRY),
  });

  return { accessToken: at, refreshToken: rt };
});

app.get('/api/auth/me', { preHandler: auth }, async (req) => {
  const db = getDb();
  const user = await db('users').where('id', req.user.sub).first();
  if (!user) return reply.status(404).send({ error: 'User not found' });
  return { user };
});

app.put('/api/auth/profile', { preHandler: auth }, async (req, reply) => {
  const db = getDb();
  const allowed = ['full_name', 'avatar', 'phone'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'No fields to update' });
  await db('users').where('id', req.user.sub).update(updates);
  const user = await db('users').where('id', req.user.sub).first();
  return { user };
});

app.post('/api/auth/logout', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('sessions').where('user_id', req.user.sub).del();
  return { success: true };
});

app.get('/api/auth/sessions', { preHandler: auth }, async (req) => {
  const db = getDb();
  const sessions = await db('sessions').where('user_id', req.user.sub).select('id', 'ip_address', 'user_agent', 'created_at');
  return { sessions };
});

app.delete('/api/auth/sessions/:id', { preHandler: auth }, async (req, reply) => {
  const db = getDb();
  await db('sessions').where({ id: req.params.id, user_id: req.user.sub }).del();
  return { success: true };
});

app.post('/api/auth/change-password', { preHandler: auth }, async (req, reply) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return reply.status(400).send({ error: 'Current and new password required' });
  const db = getDb();
  const user = await db('users').where('id', req.user.sub).first();
  if (user.password_hash !== currentPassword) return reply.status(401).send({ error: 'Current password incorrect' });
  await db('users').where('id', req.user.sub).update({ password_hash: newPassword });
  await db('sessions').where('user_id', req.user.sub).del();
  return { success: true };
});

// ── Markets ──
app.get('/api/markets', async () => {
  const db = getDb();
  const markets = await db('markets').where('is_active', 1);
  return { markets };
});

app.get('/api/markets/:symbol', async (req, reply) => {
  const db = getDb();
  const market = await db('markets').where('symbol', req.params.symbol).first();
  if (!market) return reply.status(404).send({ error: 'Market not found' });
  return { market };
});

app.get('/api/markets/:symbol/orderbook', async (req) => {
  const symbol = req.params.symbol;
  const cached = await getOrderBook(symbol, 20);
  return { bids: cached.bids, asks: cached.asks, timestamp: cached.timestamp || Date.now() };
});

app.get('/api/markets/:symbol/candles', async (req) => {
  const tf = req.query.timeframe || '5m';
  const limit = parseInt(req.query.limit) || 100;
  const candles = await getCandles(req.params.symbol, tf, limit);
  return { candles };
});

app.get('/api/ticker', async () => {
  const tickers = await getTickers();
  return { tickers };
});

// ── Orders ──
app.get('/api/orders', { preHandler: auth }, async (req) => {
  const db = getDb();
  let query = db('orders').where('user_id', req.user.sub);
  if (req.query.symbol) query = query.where('symbol', req.query.symbol);
  if (req.query.status) query = query.where('status', req.query.status);
  const orders = await query.orderBy('created_at', 'desc');
  return { orders };
});

app.post('/api/orders', { preHandler: auth }, async (req, reply) => {
  const { symbol, type, side, price, amount } = req.body;
  if (!symbol || !side || !amount) return reply.status(400).send({ error: 'symbol, side, amount required' });
  try {
    const result = await placeOrder(req.user.sub, symbol, type || 'limit', side, parseFloat(price || 0), parseFloat(amount));
    return reply.status(201).send({ order: result });
  } catch (e) {
    return reply.status(400).send({ error: e.message });
  }
});

app.get('/api/orders/:id', { preHandler: auth }, async (req, reply) => {
  const db = getDb();
  const order = await db('orders').where({ id: req.params.id, user_id: req.user.sub }).first();
  if (!order) return reply.status(404).send({ error: 'Order not found' });
  return { order };
});

app.delete('/api/orders/:id', { preHandler: auth }, async (req, reply) => {
  try {
    const result = await cancelOrder(req.user.sub, req.params.id);
    return result;
  } catch (e) {
    return reply.status(400).send({ error: e.message });
  }
});

// ── Trades ──
app.get('/api/trades', { preHandler: auth }, async (req) => {
  const db = getDb();
  let query = db('trades').where('user_id', req.user.sub);
  if (req.query.symbol) query = query.where('symbol', req.query.symbol);
  const trades = await query.orderBy('created_at', 'desc').limit(parseInt(req.query.limit) || 50);
  return { trades };
});

// ── Wallets ──
app.get('/api/wallets', { preHandler: auth }, async (req) => {
  const db = getDb();
  const wallets = await db('wallets').where({ user_id: req.user.sub, is_fiat: 0 });
  return { wallets };
});

app.post('/api/wallets/bootstrap', { preHandler: auth }, async (req) => {
  const db = getDb();
  const wallets = await db('wallets').where({ user_id: req.user.sub, is_fiat: 0 });
  return { wallets };
});

app.post('/api/wallets/deposit', { preHandler: auth }, async (req, reply) => {
  const { currency, amount } = req.body;
  if (!currency || !amount) return reply.status(400).send({ error: 'currency and amount required' });
  const db = getDb();
  const wallet = await db('wallets').where({ user_id: req.user.sub, currency }).first();
  if (wallet) await db('wallets').where('id', wallet.id).increment('balance', parseFloat(amount));
  else await db('wallets').insert({ id: `w-${Date.now()}`, user_id: req.user.sub, currency, balance: parseFloat(amount) });
  const updated = await db('wallets').where({ user_id: req.user.sub, currency }).first();
  return { wallet: updated };
});

app.post('/api/wallets/withdraw', { preHandler: auth }, async (req, reply) => {
  const { currency, amount, address, network } = req.body;
  if (!currency || !amount || !address) return reply.status(400).send({ error: 'currency, amount, address required' });
  const db = getDb();
  const wallet = await db('wallets').where({ user_id: req.user.sub, currency }).first();
  if (!wallet || wallet.balance < parseFloat(amount)) return reply.status(400).send({ error: 'Insufficient balance' });
  await db('wallets').where('id', wallet.id).decrement('balance', parseFloat(amount));
  await db('withdraw_requests').insert({
    id: `wr-${Date.now()}`, user_id: req.user.sub, currency,
    amount: parseFloat(amount), address, network: network || currency,
    status: 'pending', created_at: new Date(),
  });
  return { success: true, remaining: wallet.balance - parseFloat(amount) };
});

app.get('/api/fiat-wallets', { preHandler: auth }, async (req) => {
  const db = getDb();
  const wallets = await db('wallets').where({ user_id: req.user.sub, is_fiat: 1 });
  return { wallets };
});

app.post('/api/fiat-wallets', { preHandler: auth }, async (req, reply) => {
  const { currency, iban } = req.body;
  if (!currency) return reply.status(400).send({ error: 'currency required' });
  const db = getDb();
  const existing = await db('wallets').where({ user_id: req.user.sub, currency, is_fiat: 1 }).first();
  if (existing) return { wallet: existing };
  const id = `w-${Date.now()}`;
  await db('wallets').insert({ id, user_id: req.user.sub, currency, balance: 0, is_fiat: 1, iban: iban || null });
  const wallet = await db('wallets').where('id', id).first();
  return reply.status(201).send({ wallet });
});

// ── Banking ──
app.get('/api/banking/methods', async () => {
  const db = getDb();
  const methods = await db('banking_methods');
  return { methods };
});

app.get('/api/banking/transactions', { preHandler: auth }, async (req) => {
  const db = getDb();
  let query = db('banking_transactions').where('user_id', req.user.sub);
  if (req.query.status) query = query.where('status', req.query.status);
  const transactions = await query.orderBy('created_at', 'desc').limit(parseInt(req.query.limit) || 20);
  return { transactions };
});

app.post('/api/banking/deposit', { preHandler: auth }, async (req, reply) => {
  const { method, amount, currency } = req.body;
  if (!method || !amount) return reply.status(400).send({ error: 'method and amount required' });
  const db = getDb();
  const id = `bt-${Date.now()}`;
  const cur = currency || 'USD';
  await db('banking_transactions').insert({ id, user_id: req.user.sub, method, type: 'deposit', amount: parseFloat(amount), currency: cur, status: 'completed', created_at: new Date() });
  const wallet = await db('wallets').where({ user_id: req.user.sub, currency: cur, is_fiat: 1 }).first();
  if (wallet) await db('wallets').where('id', wallet.id).increment('balance', parseFloat(amount));
  const tx = await db('banking_transactions').where('id', id).first();
  return { transaction: tx };
});

app.post('/api/banking/withdraw', { preHandler: auth }, async (req, reply) => {
  const { method, amount, currency } = req.body;
  if (!method || !amount) return reply.status(400).send({ error: 'method and amount required' });
  const db = getDb();
  const cur = currency || 'USD';
  const wallet = await db('wallets').where({ user_id: req.user.sub, currency: cur, is_fiat: 1 }).first();
  if (!wallet || wallet.balance < parseFloat(amount)) return reply.status(400).send({ error: 'Insufficient balance' });
  await db('wallets').where('id', wallet.id).decrement('balance', parseFloat(amount));
  const id = `bt-${Date.now()}`;
  await db('banking_transactions').insert({ id, user_id: req.user.sub, method, type: 'withdraw', amount: parseFloat(amount), currency: cur, status: 'completed', created_at: new Date() });
  const tx = await db('banking_transactions').where('id', id).first();
  return { transaction: tx };
});

app.post('/api/banking/transfer', { preHandler: auth }, async (req, reply) => {
  const { fromCurrency, toCurrency, amount } = req.body;
  if (!fromCurrency || !toCurrency || !amount) return reply.status(400).send({ error: 'fromCurrency, toCurrency, amount required' });
  const db = getDb();
  const fromW = await db('wallets').where({ user_id: req.user.sub, currency: fromCurrency, is_fiat: 1 }).first();
  if (!fromW || fromW.balance < parseFloat(amount)) return reply.status(400).send({ error: 'Insufficient balance' });
  await db('wallets').where('id', fromW.id).decrement('balance', parseFloat(amount));
  const toW = await db('wallets').where({ user_id: req.user.sub, currency: toCurrency, is_fiat: 1 }).first();
  if (toW) await db('wallets').where('id', toW.id).increment('balance', parseFloat(amount));
  return { success: true };
});

app.get('/api/banking/performance', { preHandler: auth }, async () => {
  return { totalDeposits: 1250000, totalWithdrawals: 450000, totalTransfers: 320000 };
});

// ── KYC ──
app.post('/api/kyc/submit', { preHandler: auth }, async (req, reply) => {
  const { type, documentData } = req.body;
  if (!type) return reply.status(400).send({ error: 'type required' });
  const db = getDb();
  const id = `kyc-${Date.now()}`;
  await db('kyc_documents').insert({ id, user_id: req.user.sub, type, status: 'pending', submitted_at: new Date() });
  await db('users').where('id', req.user.sub).update({ kyc_status: 'pending' });
  return reply.status(201).send({ document: { id, status: 'pending' } });
});

app.get('/api/kyc/status', { preHandler: auth }, async (req) => {
  const db = getDb();
  const user = await db('users').where('id', req.user.sub).select('kyc_status').first();
  return { status: user ? user.kyc_status : 'none' };
});

app.post('/api/kyc/:id/upload', { preHandler: auth }, async () => {
  return { success: true, url: '/uploads/placeholder.jpg' };
});

// ── Futures ──
app.get('/api/futures/positions', { preHandler: auth }, async (req) => {
  const db = getDb();
  const positions = await db('futures_positions').where('user_id', req.user.sub).orderBy('created_at', 'desc');
  return { positions };
});

app.post('/api/futures/positions', { preHandler: auth }, async (req, reply) => {
  const { symbol, side, size, leverage } = req.body;
  if (!symbol || !side || !size) return reply.status(400).send({ error: 'symbol, side, size required' });
  const db = getDb();
  const market = await db('markets').where('symbol', symbol).first();
  const price = market ? market.price : 50000;
  const lev = parseInt(leverage) || 1;
  const margin = (parseFloat(size) * price) / lev;
  const id = `fp-${Date.now()}`;
  await db('futures_positions').insert({
    id, user_id: req.user.sub, symbol, side, size: parseFloat(size), leverage: lev,
    entry_price: price, mark_price: price, liquidation_price: lev > 1 ? price * (1 - 1 / lev) : price * 0.9,
    pnl: 0, pnl_percent: 0, margin, status: 'open', created_at: new Date(),
  });
  const pos = await db('futures_positions').where('id', id).first();
  return reply.status(201).send({ position: pos });
});

app.put('/api/futures/positions/:id/close', { preHandler: auth }, async (req) => {
  const db = getDb();
  const pos = await db('futures_positions').where({ id: req.params.id, user_id: req.user.sub }).first();
  if (pos) {
    const market = await db('markets').where('symbol', pos.symbol).first();
    const currentPrice = market ? market.price : pos.entry_price;
    const pnl = pos.side === 'long' ? (currentPrice - pos.entry_price) * pos.size : (pos.entry_price - currentPrice) * pos.size;
    await db('futures_positions').where('id', req.params.id).update({ status: 'closed', pnl, mark_price: currentPrice, pnl_percent: pos.margin > 0 ? (pnl / pos.margin) * 100 : 0 });
    await db('wallets').where({ user_id: req.user.sub, currency: 'USDT' }).increment('balance', pos.margin + pnl);
  }
  return { success: true };
});

app.post('/api/futures/leverage', { preHandler: auth }, async (req) => {
  return { success: true, leverage: req.body.leverage || 1 };
});

// ── Trading Bots ──
app.get('/api/bots', { preHandler: auth }, async (req) => {
  const db = getDb();
  const bots = await db('trading_bots').where('user_id', req.user.sub).orderBy('created_at', 'desc');
  return { bots };
});

app.post('/api/bots', { preHandler: auth }, async (req, reply) => {
  const { name, strategy, symbol, config } = req.body;
  if (!name || !strategy || !symbol) return reply.status(400).send({ error: 'name, strategy, symbol required' });
  const db = getDb();
  const id = `bot-${Date.now()}`;
  await db('trading_bots').insert({ id, user_id: req.user.sub, name, strategy, symbol, config: JSON.stringify(config || {}), status: 'stopped', created_at: new Date() });
  const bot = await db('trading_bots').where('id', id).first();
  return reply.status(201).send({ bot });
});

app.put('/api/bots/:id', { preHandler: auth }, async (req, reply) => {
  const db = getDb();
  const { name, strategy, symbol, config } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (strategy) updates.strategy = strategy;
  if (symbol) updates.symbol = symbol;
  if (config) updates.config = JSON.stringify(config);
  if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'No fields to update' });
  await db('trading_bots').where({ id: req.params.id, user_id: req.user.sub }).update(updates);
  const bot = await db('trading_bots').where('id', req.params.id).first();
  return { bot };
});

app.post('/api/bots/:id/start', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('trading_bots').where({ id: req.params.id, user_id: req.user.sub }).update({ status: 'running' });
  const bot = await db('trading_bots').where('id', req.params.id).first();
  return { bot };
});

app.post('/api/bots/:id/stop', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('trading_bots').where({ id: req.params.id, user_id: req.user.sub }).update({ status: 'stopped' });
  const bot = await db('trading_bots').where('id', req.params.id).first();
  return { bot };
});

app.delete('/api/bots/:id', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('trading_bots').where({ id: req.params.id, user_id: req.user.sub }).del();
  return { success: true };
});

// ── Copy Trading ──
app.get('/api/copy-trading/traders', async (req) => {
  const db = getDb();
  let query = db('copy_traders').where('is_active', 1);
  if (req.query.minWinRate) query = query.where('win_rate', '>=', parseFloat(req.query.minWinRate));
  if (req.query.maxRisk) query = query.where('risk_score', '<=', parseInt(req.query.maxRisk));
  const traders = await query.orderBy('followers', 'desc');
  return { traders };
});

app.get('/api/copy-trading/traders/:id', async (req, reply) => {
  const db = getDb();
  const trader = await db('copy_traders').where('id', req.params.id).first();
  if (!trader) return reply.status(404).send({ error: 'Trader not found' });
  return { trader };
});

app.get('/api/copy-trading/my-copies', { preHandler: auth }, async (req) => {
  const db = getDb();
  const copies = await db('copy_copies as c').join('copy_traders as ct', 'c.trader_id', 'ct.id')
    .where('c.user_id', req.user.sub).select('c.*', 'ct.display_name', 'ct.total_pnl', 'ct.win_rate', 'ct.risk_score');
  return { copies };
});

app.post('/api/copy-trading/copy', { preHandler: auth }, async (req, reply) => {
  const { traderId, allocation } = req.body;
  if (!traderId) return reply.status(400).send({ error: 'traderId required' });
  const db = getDb();
  const id = `cc-${Date.now()}`;
  await db('copy_copies').insert({ id, user_id: req.user.sub, trader_id: traderId, allocation: parseFloat(allocation || 100) });
  await db('copy_traders').where('id', traderId).increment('followers', 1);
  const copy = await db('copy_copies').where('id', id).first();
  return reply.status(201).send({ copy });
});

app.put('/api/copy-trading/copy/:id/stop', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('copy_copies').where({ id: req.params.id, user_id: req.user.sub }).update({ status: 'stopped' });
  return { success: true };
});

// ── Earn / Staking ──
app.get('/api/earn/products', async () => {
  const db = getDb();
  const products = await db('earn_products').where('is_active', 1);
  return { products };
});

app.post('/api/earn/stake', { preHandler: auth }, async (req, reply) => {
  const { productId, amount } = req.body;
  if (!productId || !amount) return reply.status(400).send({ error: 'productId and amount required' });
  const db = getDb();
  const product = await db('earn_products').where('id', productId).first();
  if (!product) return reply.status(404).send({ error: 'Product not found' });
  const wallet = await db('wallets').where({ user_id: req.user.sub, currency: product.name.startsWith('BTC') ? 'BTC' : product.name.startsWith('ETH') ? 'ETH' : 'USDT' }).first();
  if (!wallet || wallet.balance < parseFloat(amount)) return reply.status(400).send({ error: 'Insufficient balance' });
  await db('wallets').where('id', wallet.id).decrement('balance', parseFloat(amount));
  const id = `ep-${Date.now()}`;
  await db('earn_positions').insert({ id, user_id: req.user.sub, product_id: productId, type: product.type, amount: parseFloat(amount), apr: product.apr, earned: 0, status: 'active', started_at: new Date() });
  const position = await db('earn_positions').where('id', id).first();
  return reply.status(201).send({ position });
});

app.get('/api/earn/positions', { preHandler: auth }, async (req) => {
  const db = getDb();
  const positions = await db('earn_positions').where('user_id', req.user.sub).orderBy('started_at', 'desc');
  return { positions };
});

app.post('/api/earn/liquidity', { preHandler: auth }, async (req, reply) => {
  const { symbol, amount } = req.body;
  if (!symbol || !amount) return reply.status(400).send({ error: 'symbol and amount required' });
  const db = getDb();
  const id = `ep-${Date.now()}`;
  await db('earn_positions').insert({ id, user_id: req.user.sub, product_id: `liq-${symbol}`, type: 'liquidity', amount: parseFloat(amount), apr: 12.5, earned: 0, status: 'active', started_at: new Date() });
  const position = await db('earn_positions').where('id', id).first();
  return reply.status(201).send({ position });
});

app.post('/api/earn/liquidity/:id/withdraw', { preHandler: auth }, async (req) => {
  const db = getDb();
  const pos = await db('earn_positions').where({ id: req.params.id, user_id: req.user.sub }).first();
  if (pos) await db('wallets').where({ user_id: req.user.sub, is_fiat: 0 }).increment('balance', pos.amount + pos.earned);
  await db('earn_positions').where({ id: req.params.id, user_id: req.user.sub }).update({ status: 'withdrawn' });
  return { success: true };
});

// ── Price Alerts ──
app.get('/api/price-alerts', { preHandler: auth }, async (req) => {
  const db = getDb();
  const alerts = await db('price_alerts').where('user_id', req.user.sub).orderBy('created_at', 'desc');
  return { alerts };
});

app.post('/api/price-alerts', { preHandler: auth }, async (req, reply) => {
  const { symbol, targetPrice, direction } = req.body;
  if (!symbol || !targetPrice || !direction) return reply.status(400).send({ error: 'symbol, targetPrice, direction required' });
  const db = getDb();
  const id = `pa-${Date.now()}`;
  await db('price_alerts').insert({ id, user_id: req.user.sub, symbol, target_price: parseFloat(targetPrice), direction, status: 'active', created_at: new Date() });
  const alert = await db('price_alerts').where('id', id).first();
  return reply.status(201).send({ alert });
});

app.put('/api/price-alerts/:id/toggle', { preHandler: auth }, async (req, reply) => {
  const db = getDb();
  const alert = await db('price_alerts').where({ id: req.params.id, user_id: req.user.sub }).first();
  if (!alert) return reply.status(404).send({ error: 'Alert not found' });
  const newStatus = alert.status === 'active' ? 'paused' : 'active';
  await db('price_alerts').where('id', req.params.id).update({ status: newStatus });
  return { alert: { ...alert, status: newStatus } };
});

app.delete('/api/price-alerts/:id', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('price_alerts').where({ id: req.params.id, user_id: req.user.sub }).del();
  return { success: true };
});

// ── AI Models ──
app.get('/api/ai-models', async () => ({
  models: [
    { id: 'threat-detect-v4', name: 'Threat Detection v4.3', type: 'Neural Network', status: 'active', accuracy: 97.3, latency: '12ms', trainingData: '2.4M events', version: '4.3.1', color: '#CF304A', capabilities: ['Flash loan detection', 'Wallet clustering', 'Velocity analysis', 'Address poisoning'], metrics: [
      { metric: 'Precision', score: 97 }, { metric: 'Recall', score: 96 }, { metric: 'F1 Score', score: 96.5 }, { metric: 'AUC-ROC', score: 99 }, { metric: 'Latency', score: 95 }, { metric: 'Coverage', score: 94 },
    ] },
    { id: 'behavioral-ml-v3', name: 'Behavioral ML v3.7', type: 'Gradient Boosting', status: 'active', accuracy: 94.8, latency: '8ms', trainingData: '1.8M sessions', version: '3.7.4', color: '#627EEA', capabilities: ['Sybil detection', 'Bot fingerprinting', 'Session analysis', 'Temporal clustering'], metrics: [
      { metric: 'Precision', score: 95 }, { metric: 'Recall', score: 94 }, { metric: 'F1 Score', score: 94.5 }, { metric: 'AUC-ROC', score: 97 }, { metric: 'Latency', score: 98 }, { metric: 'Coverage', score: 92 },
    ] },
    { id: 'risk-scoring-v2', name: 'Risk Scoring v2.9', type: 'Ensemble', status: 'active', accuracy: 96.2, latency: '45ms', trainingData: '5.1M txns', version: '2.9.1', color: '#F0B90B', capabilities: ['AML scoring', 'Wallet risk assessment', 'Pattern recognition', 'Anomaly detection'], metrics: [
      { metric: 'Precision', score: 96 }, { metric: 'Recall', score: 95 }, { metric: 'F1 Score', score: 95.5 }, { metric: 'AUC-ROC', score: 98 }, { metric: 'Latency', score: 88 }, { metric: 'Coverage', score: 96 },
    ] },
    { id: 'anomaly-detector-v5', name: 'Anomaly Detector v5.0', type: 'Autoencoder', status: 'active', accuracy: 93.5, latency: '23ms', trainingData: '3.2M events', version: '5.0.2', color: '#8247E5', capabilities: ['Network anomaly detection', 'Unusual transaction patterns', 'Contract interaction analysis'], metrics: [
      { metric: 'Precision', score: 93 }, { metric: 'Recall', score: 94 }, { metric: 'F1 Score', score: 93.5 }, { metric: 'AUC-ROC', score: 96 }, { metric: 'Latency', score: 92 }, { metric: 'Coverage', score: 90 },
    ] },
    { id: 'whale-tracker-v1', name: 'Whale Tracker v1.2', type: 'Graph Neural Net', status: 'beta', accuracy: 89.8, latency: '67ms', trainingData: '1.1M wallets', version: '1.2.0', color: '#03A66D', capabilities: ['Whale wallet identification', 'Fund flow tracing', 'Accumulation/distribution detection'], metrics: [
      { metric: 'Precision', score: 91 }, { metric: 'Recall', score: 88 }, { metric: 'F1 Score', score: 89.5 }, { metric: 'AUC-ROC', score: 93 }, { metric: 'Latency', score: 72 }, { metric: 'Coverage', score: 85 },
    ] },
  ],
}));

// ── Liquidity Pools ──
app.get('/api/liquidity/pools', async () => ({
  pools: [
    { id: 'eth-usdt', name: 'ETH/USDT', tokenA: 'ETH', tokenB: 'USDT', chain: 'ETH', apy: 12.4, tvl: 45000000, providers: 1247, change24h: 2.1 },
    { id: 'bnb-usdt', name: 'BNB/USDT', tokenA: 'BNB', tokenB: 'USDT', chain: 'BNB', apy: 18.7, tvl: 28000000, providers: 892, change24h: -0.8 },
    { id: 'trc20-trx', name: 'USDT-TRC20/TRX', tokenA: 'USDT-TRC20', tokenB: 'TRX', chain: 'TRON', apy: 24.1, tvl: 12000000, providers: 634, change24h: 5.3 },
    { id: 'trc20-usdt', name: 'USDT-TRC20/USDT', tokenA: 'USDT-TRC20', tokenB: 'USDT', chain: 'TRON', apy: 19.5, tvl: 9500000, providers: 512, change24h: 0.1 },
    { id: 'matic-usdt', name: 'MATIC/USDT', tokenA: 'MATIC', tokenB: 'USDT', chain: 'POLY', apy: 15.2, tvl: 8000000, providers: 421, change24h: 1.7 },
    { id: 'sol-usdt', name: 'SOL/USDT', tokenA: 'SOL', tokenB: 'USDT', chain: 'SOL', apy: 16.8, tvl: 22000000, providers: 780, change24h: 3.2 },
    { id: 'avax-usdt', name: 'AVAX/USDT', tokenA: 'AVAX', tokenB: 'USDT', chain: 'AVAX', apy: 14.5, tvl: 6500000, providers: 312, change24h: 1.4 },
    { id: 'doge-usdt', name: 'DOGE/USDT', tokenA: 'DOGE', tokenB: 'USDT', chain: 'DOGE', apy: 9.8, tvl: 4200000, providers: 198, change24h: 6.7 },
  ],
}));

// ── Rewards ──
app.get('/api/rewards', { preHandler: auth }, async (req) => {
  const db = getDb();
  const user = await db('users').where('id', req.user.sub).select('referral_count', 'referral_bonus', 'tier').first();
  return {
    points: (user?.referral_bonus || 0) * 2,
    tier: user?.tier || 'bronze',
    referralCount: user?.referral_count || 0,
    referralBonus: user?.referral_bonus || 0,
  };
});

// ── Notifications ──
app.get('/api/notifications', { preHandler: auth }, async (req) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 20;
  const notifications = await db('notifications').where('user_id', req.user.sub).orderBy('created_at', 'desc').limit(limit);
  return { notifications };
});

app.put('/api/notifications/:id/read', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('notifications').where({ id: req.params.id, user_id: req.user.sub }).update({ read: 1 });
  return { success: true };
});

app.put('/api/notifications/read-all', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('notifications').where('user_id', req.user.sub).update({ read: 1 });
  return { success: true };
});

// ── Analytics ──
app.get('/api/analytics/portfolio', { preHandler: auth }, async (req) => {
  const db = getDb();
  const wallets = await db('wallets').where({ user_id: req.user.sub, is_fiat: 0 });
  const btcPrice = (await getTickers())['BTC/USDT']?.price || 87432.50;
  const ethPrice = (await getTickers())['ETH/USDT']?.price || 3921.80;
  let totalBalance = 0;
  for (const w of wallets) {
    if (w.currency === 'BTC') totalBalance += w.balance * btcPrice;
    else if (w.currency === 'ETH') totalBalance += w.balance * ethPrice;
    else if (w.currency === 'USDT' || w.currency === 'USDC') totalBalance += w.balance;
    else totalBalance += w.balance;
  }
  const fiatTotal = await db('wallets').where({ user_id: req.user.sub, is_fiat: 1 }).sum('balance as total').first();
  return { totalBalance: totalBalance + (fiatTotal?.total || 0), totalPnl24h: Math.random() * 5000 - 1000 };
});

app.get('/api/analytics/leaderboard', async () => {
  const db = getDb();
  const traders = await db('copy_traders').where('is_active', 1).orderBy('total_pnl', 'desc').limit(10);
  return { leaderboard: traders };
});

app.get('/api/analytics/volume-history', async (req) => {
  const days = parseInt(req.query.days) || 30;
  const history = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    history.push({ date: d.toISOString().slice(0, 10), volume: Math.random() * 50000000 + 10000000 });
  }
  return { history };
});

// ── Admin ──
app.get('/api/admin/stats', async () => {
  const db = getDb();
  const totalUsers = (await db('users').count('* as c').first()).c;
  const totalTrades = (await db('trades').count('* as c').first()).c;
  const totalVolume = (await db('trades').sum('total as t').first()).t || 0;
  return { totalUsers, totalVolume24h: totalVolume, revenue24h: totalVolume * 0.002, totalTrades };
});

app.get('/api/admin/users', async () => {
  const db = getDb();
  const users = await db('users').select('id', 'email', 'full_name', 'role', 'kyc_status', 'tier', 'is_active', 'created_at').orderBy('created_at', 'desc').limit(100);
  return { users };
});

app.put('/api/admin/users/:id', async (req, reply) => {
  const db = getDb();
  const { role, kyc_status, tier, is_active } = req.body;
  const updates = {};
  if (role) updates.role = role;
  if (kyc_status) updates.kyc_status = kyc_status;
  if (tier) updates.tier = tier;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
  if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'No fields to update' });
  await db('users').where('id', req.params.id).update(updates);
  const user = await db('users').where('id', req.params.id).first();
  return { user };
});

app.get('/api/admin/threats', async () => {
  const db = getDb();
  const threats = await db('threat_alerts').orderBy('created_at', 'desc');
  return { threats };
});

app.put('/api/admin/threats/:id/resolve', async (req) => {
  const db = getDb();
  await db('threat_alerts').where('id', req.params.id).update({ resolved: 1 });
  return { success: true };
});

app.get('/api/admin/audit-logs', async (req) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 50;
  const logs = await db('audit_logs').orderBy('created_at', 'desc').limit(limit);
  return { logs };
});

app.post('/api/admin/scan', async () => ({
  scanId: `scan-${Date.now()}`,
  threats: [{ type: 'vulnerability', severity: 'low', title: 'SSL Certificate Expiring', description: 'SSL cert expires in 14 days', source_ip: null }],
  status: 'completed',
}));

app.get('/api/admin/api-keys', async () => {
  const db = getDb();
  const keys = await db('api_keys').select('id', 'name', 'key', 'permissions', 'is_active', 'created_at').orderBy('created_at', 'desc');
  return { keys };
});

app.delete('/api/admin/api-keys/:id', async (req) => {
  const db = getDb();
  await db('api_keys').where('id', req.params.id).del();
  return { success: true };
});

// ── API Keys ──
app.get('/api/api-keys', { preHandler: auth }, async (req) => {
  const db = getDb();
  const keys = await db('api_keys').where('user_id', req.user.sub).orderBy('created_at', 'desc');
  return { keys: keys.map(k => ({ id: k.id, name: k.name, key: k.key, permissions: k.permissions, is_active: k.is_active, created_at: k.created_at })) };
});

app.post('/api/api-keys', { preHandler: auth }, async (req, reply) => {
  const { name, permissions } = req.body;
  if (!name) return reply.status(400).send({ error: 'name required' });
  const db = getDb();
  const id = `apik-${Date.now()}`;
  const key = `ATH-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  const secret = crypto.randomBytes(32).toString('hex');
  await db('api_keys').insert({ id, user_id: req.user.sub, name, key, secret, permissions: permissions || 'read', created_at: new Date() });
  return reply.status(201).send({ key: { id, name, key, secret, permissions: permissions || 'read', created_at: new Date() } });
});

app.delete('/api/api-keys/:id', { preHandler: auth }, async (req) => {
  const db = getDb();
  await db('api_keys').where({ id: req.params.id, user_id: req.user.sub }).del();
  return { success: true };
});

// ── Entity Proxy ──
const ENTITY_MAP = {
  UserProfile: 'users', Wallet: 'wallets', SwapOrder: 'orders', TradingBot: 'trading_bots',
  CopyTrader: 'copy_traders', StakingPosition: 'earn_positions', LiquiditySession: 'earn_positions',
  FuturesPosition: 'futures_positions', ThreatAlert: 'threat_alerts', AuditLog: 'audit_logs',
  FiatWallet: 'wallets', BankTransaction: 'banking_transactions', Referral: 'referrals',
  PriceAlert: 'price_alerts', Notification: 'notifications', ApiKey: 'api_keys',
};

const ENTITY_FILTERS = {
  UserProfile: ['id'], Wallet: ['user_id', { is_fiat: 0 }], FiatWallet: ['user_id', { is_fiat: 1 }],
  SwapOrder: ['user_id'], TradingBot: ['user_id'], FuturesPosition: ['user_id'],
  StakingPosition: ['user_id'], LiquiditySession: ['user_id'], ThreatAlert: null,
  AuditLog: null, BankTransaction: ['user_id'], Referral: ['user_id'], PriceAlert: ['user_id'],
  Notification: ['user_id'], ApiKey: ['user_id'],
};

app.all('/api/entities/:name', { preHandler: auth }, async (req, reply) => {
  return handleEntity(req, reply);
});
app.all('/api/entities/:name/:id', { preHandler: auth }, async (req, reply) => {
  return handleEntity(req, reply);
});

async function handleEntity(req, reply) {
  const db = getDb();
  const table = ENTITY_MAP[req.params.name];
  if (!table) return reply.status(400).send({ error: `Unknown entity: ${req.params.name}` });

  const filters = ENTITY_FILTERS[req.params.name];
  const { id } = req.params;
  const method = req.method;

  if ((method === 'GET' && id === 'filter') || (method === 'GET' && !id)) {
    let query = db(table).where('1', '1');
    if (filters) {
      for (const f of filters) {
        if (typeof f === 'object') { for (const [k, v] of Object.entries(f)) query = query.where(k, v); }
        else if (f === 'user_id') query = query.where('user_id', req.user.sub);
        else if (f === 'id') query = query.where('id', req.user.sub);
      }
    }
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== '_t') query = query.where(k, v);
    }
    const rows = await query.orderBy('created_at', 'desc');
    return { data: rows };
  }

  if (method === 'GET' && id) {
    let query = db(table).where('id', id);
    if (filters && table !== 'threat_alerts' && filters.includes('user_id')) query = query.where('user_id', req.user.sub);
    const row = await query.first();
    if (!row) return reply.status(404).send({ error: 'Not found' });
    return { data: row };
  }

  if (method === 'POST') {
    const body = { ...req.body };
    if (filters && filters.includes('user_id') && !body.user_id) body.user_id = req.user.sub;
    if (!body.id) body.id = `${table}-${Date.now()}`;
    body.created_at = new Date();
    await db(table).insert(body);
    const row = await db(table).where('id', body.id).first();
    return reply.status(201).send({ data: row });
  }

  if (method === 'PUT' && id) {
    const allowed = Object.keys(req.body).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
    if (allowed.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    const updates = {};
    for (const k of allowed) updates[k] = req.body[k];
    let query = db(table).where('id', id);
    if (filters && table !== 'threat_alerts' && filters.includes('user_id')) query = query.where('user_id', req.user.sub);
    await query.update(updates);
    const row = await db(table).where('id', id).first();
    return { data: row };
  }

  if (method === 'DELETE' && id) {
    let query = db(table).where('id', id);
    if (filters && filters.includes('user_id')) query = query.where('user_id', req.user.sub);
    await query.del();
    return { success: true };
  }

  return reply.status(405).send({ error: 'Method not allowed' });
}

// ── Functions ──
const functions = {
  getLiveMarketData: async () => {
    const tickers = await getTickers();
    return { markets: Object.values(tickers), timestamp: Date.now() };
  },
  aiTradingSignals: async () => {
    const tickers = await getTickers();
    const btc = tickers['BTC/USDT'];
    const eth = tickers['ETH/USDT'];
    return {
      signals: [
        { symbol: 'BTC/USDT', signal: 'strong_buy', confidence: 87, reason: 'Golden cross detected on 4H chart with high volume', price: btc?.price || 87432 },
        { symbol: 'ETH/USDT', signal: 'buy', confidence: 72, reason: 'RSI oversold bounce', price: eth?.price || 3921 },
        { symbol: 'SOL/USDT', signal: 'sell', confidence: 65, reason: 'Resistance at $192' },
      ],
    };
  },
  bankTransfer: (args) => ({ success: true, transferId: `trf-${Date.now()}`, ...args }),
  submitContactMessage: () => ({ success: true, message: 'Your message has been received.' }),
  getMarketIntelligence: async () => ({
    news: [
      { title: 'BTC holds above $87K as institutional inflows continue', sentiment: 'bullish', source: 'CoinDesk', time: Date.now() - 3600000 },
      { title: 'Ethereum Pectra upgrade scheduled for Q3 2026', sentiment: 'bullish', source: 'The Block', time: Date.now() - 7200000 },
    ],
    onChainMetrics: { btcExchangeInflows: -12.5, stablecoinSupply: 182.4 },
  }),
  manageOKXOrders: () => ({ orders: [], total: 0 }),
  executeOKXTrade: () => ({ success: true, orderId: `okx-${Date.now()}` }),
  executeTrade: async (args) => {
    try {
      return await placeOrder('user-1', args.symbol || 'BTC/USDT', 'market', args.side || 'buy', args.price || 87432.50, parseFloat(args.amount || 0));
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  generateThreatAlerts: async () => {
    const db = getDb();
    const threats = await db('threat_alerts').where('resolved', 0).orderBy('created_at', 'desc').limit(5);
    return { threats };
  },
  militaryCrypto: () => ({ status: 'active', algorithms: ['AES-256-GCM', 'ChaCha20-Poly1305'], keyStrength: 256 }),
  manage2FA: (args) => ({ success: true, enabled: args?.enable || false }),
  submitKYC: async (args) => {
    const db = getDb();
    await db('users').where('id', 'user-1').update({ kyc_status: 'pending' });
    return { success: true, status: 'pending' };
  },
  manageOKXKeys: (args) => ({ success: true, configured: !!args?.apiKey }),
};

app.post('/api/functions/invoke', { preHandler: auth }, async (req, reply) => {
  const { functionName, args } = req.body;
  if (!functionName || !functions[functionName]) return reply.status(404).send({ error: `Function ${functionName} not found` });
  try {
    const result = typeof functions[functionName] === 'function' ? await functions[functionName](args) : functions[functionName];
    return { result };
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// ── P2P Trading ──
app.get('/api/p2p/advertisements', async (req) => {
  try { return await P2P.listAdvertisements(req.query); } catch (e) { return { error: e.message }; }
});
app.post('/api/p2p/advertisements', async (req, reply) => {
  try { const { id } = req.user; return await P2P.createAdvertisement(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/p2p/orders', async (req, reply) => {
  try { const { id } = req.user; return await P2P.createOrder(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/p2p/orders', async (req) => {
  try { const { id } = req.user; return await P2P.getUserOrders(id); } catch (e) { return { error: e.message }; }
});
app.post('/api/p2p/orders/:id/pay', async (req, reply) => {
  try { const { id } = req.user; return await P2P.confirmPaid(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/p2p/orders/:id/release', async (req, reply) => {
  try { const { id } = req.user; return await P2P.confirmRelease(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/p2p/orders/:id/dispute', async (req, reply) => {
  try { const { id } = req.user; return await P2P.openDispute(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/p2p/payment-methods', async (req) => {
  try { return await P2P.getPaymentMethods(); } catch (e) { return { error: e.message }; }
});

// ── AI Trading Assistant ──
app.get('/api/ai-assistant/analysis/:symbol', async (req, reply) => {
  try { return await AI.analyzeMarket(req.params.symbol); } catch (e) { return { analysis: `Analysis unavailable for ${req.params.symbol}: ${e.message}` }; }
});
app.get('/api/ai-assistant/predictions/:symbol', async (req, reply) => {
  try { return await AI.predictPrice(req.params.symbol); } catch (e) { return { prediction: `Prediction unavailable: ${e.message}` }; }
});
app.get('/api/ai-assistant/portfolio-advice', async (req, reply) => {
  try { const { id } = req.user; return await AI.portfolioAdvice(id); } catch (e) { return { advice: `Advice unavailable: ${e.message}` }; }
});
app.get('/api/ai-assistant/signals', async (req, reply) => {
  try { return await AI.generateSignals(); } catch (e) { return { signals: [], message: e.message }; }
});
app.post('/api/ai-assistant/chat', async (req, reply) => {
  try { const { id } = req.user; return await AI.chatWithAI(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});

// ── Strategy Marketplace ──
app.get('/api/marketplace/strategies', async (req) => {
  try { return await Marketplace.listStrategies(req.query); } catch (e) { return { error: e.message }; }
});
app.post('/api/marketplace/strategies', async (req, reply) => {
  try { const { id } = req.user; return await Marketplace.createStrategy(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/marketplace/strategies/:id/purchase', async (req, reply) => {
  try { const { id } = req.user; return await Marketplace.purchaseStrategy(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/marketplace/user-strategies', async (req) => {
  try { const { id } = req.user; return await Marketplace.getUserStrategies(id); } catch (e) { return { error: e.message }; }
});
app.post('/api/marketplace/strategies/:id/reviews', async (req, reply) => {
  try { const { id } = req.user; return await Marketplace.submitReview(id, req.params.id, req.body.rating, req.body.comment); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/marketplace/strategies/:id/performance', async (req) => {
  try { return await Marketplace.getStrategyPerformance(req.params.id); } catch (e) { return { error: e.message }; }
});

// ── Social Trading Rooms ──
app.get('/api/social/rooms', async (req) => {
  try { return await Social.listRooms(req.query); } catch (e) { return { error: e.message }; }
});
app.post('/api/social/rooms', async (req, reply) => {
  try { const { id } = req.user; return await Social.createRoom(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/social/rooms/:id/join', async (req, reply) => {
  try { const { id } = req.user; return await Social.joinRoom(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/social/rooms/:id/leave', async (req, reply) => {
  try { const { id } = req.user; return await Social.leaveRoom(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/social/rooms/:id/messages', async (req) => {
  try { return await Social.getRoomMessages(req.params.id, parseInt(req.query.limit || 50)); } catch (e) { return { error: e.message }; }
});
app.post('/api/social/rooms/:id/messages', async (req, reply) => {
  try { const { id } = req.user; return await Social.sendRoomMessage(id, req.params.id, req.body.content, req.body.type); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/social/rooms/:id/members', async (req) => {
  try { return await Social.getRoomMembers(req.params.id); } catch (e) { return { error: e.message }; }
});
app.post('/api/social/signals', async (req, reply) => {
  try { const { id } = req.user; return await Social.createSignal(id, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/social/signals', async (req) => {
  try { return await Social.listSignals(req.query); } catch (e) { return { error: e.message }; }
});

// ── Wallet Protection ──
app.post('/api/wallet-protect/detect', async (req, reply) => {
  try { const { id } = req.user; return await WalletProtect.detectAnomaly(id, req.body.action, req.body); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/wallet-protect/whitelist', async (req) => {
  try { const { id } = req.user; return await WalletProtect.getWhitelist(id); } catch (e) { return { error: e.message }; }
});
app.post('/api/wallet-protect/whitelist', async (req, reply) => {
  try { const { id } = req.user; return await WalletProtect.whitelistAddress(id, req.body.address, req.body.label); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.delete('/api/wallet-protect/whitelist/:id', async (req, reply) => {
  try { const { id } = req.user; return await WalletProtect.removeWhitelist(id, req.params.id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.post('/api/wallet-protect/limits', async (req, reply) => {
  try { const { id } = req.user; return await WalletProtect.setWithdrawalLimit(id, req.body.daily, req.body.tx); } catch (e) { return reply.status(400).send({ error: e.message }); }
});
app.get('/api/wallet-protect/limits', async (req) => {
  try { const { id } = req.user; return await WalletProtect.getWalletLimits(id); } catch (e) { return { error: e.message }; }
});
app.post('/api/wallet-protect/cold-wallet', async (req, reply) => {
  try { const { id } = req.user; return await WalletProtect.generateColdWallet(id); } catch (e) { return reply.status(400).send({ error: e.message }); }
});

// ── Health ──
app.get('/api/health', async () => {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    return { status: 'ok', uptime: process.uptime(), version: '2.0.0' };
  } catch {
    return { status: 'error' };
  }
});
app.get('/api/healthz', async () => ({ status: 'ok' }));
app.get('/api/ping', async () => ({ pong: true, timestamp: Date.now() }));

// ── Static files ──
if (fs.existsSync(STATIC_DIR)) {
  app.register(staticFiles, {
    root: STATIC_DIR,
    prefix: '/',
    wildcard: false,
  });
  app.setNotFoundHandler((req, reply) => {
    const indexPath = path.join(STATIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) reply.type('text/html').send(fs.readFileSync(indexPath));
    else reply.status(404).send('Not found');
  });
}

// ── Start ──
await initDb();

const migrations = [
  ['ALTER TABLE sessions ADD COLUMN expires_at TIMESTAMP'],
  ['ALTER TABLE sessions ADD COLUMN ip_address TEXT'],
  ['ALTER TABLE sessions ADD COLUMN user_agent TEXT'],
  ['ALTER TABLE markets ADD COLUMN updated_at TIMESTAMP'],
  ['ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP'],
  ['ALTER TABLE orders ADD COLUMN reduce_only TEXT DEFAULT \'false\''],
  ['ALTER TABLE earn_positions ADD COLUMN earned REAL DEFAULT 0'],
  ['ALTER TABLE withdraw_requests ADD COLUMN tx_hash TEXT'],
  ['CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, key TEXT UNIQUE NOT NULL, secret TEXT NOT NULL, permissions TEXT DEFAULT \'read\', is_active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'],
  ['CREATE TABLE IF NOT EXISTS withdraw_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), currency TEXT NOT NULL, amount REAL NOT NULL, address TEXT NOT NULL, network TEXT NOT NULL, status TEXT DEFAULT \'pending\', tx_hash TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'],
];
for (const [sql] of migrations) {
  try { const db = getDb(); await db.raw(sql); } catch (e) { /* skip existing */ }
}
await runMigrations(getDb());

await initExchange();
await setupWebSocket(app);

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const db = getDb();
    const userCount = (await db('users').count('* as c').first()).c;
    const marketCount = (await db('markets').count('* as m').first()).m;
    const mode = process.env.DATABASE_URL || process.env.PG_HOST ? 'PostgreSQL' : 'SQLite';
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  ATHEER Global Platform v2.0           ║`);
    console.log(`  ╠══════════════════════════════════════════╣`);
    console.log(`  ║  Mode:    Production (${mode})           ${mode === 'PostgreSQL' ? ' ' : ''}║`);
    console.log(`  ║  Server:  http://localhost:${PORT}        ║`);
    console.log(`  ║  WebSocket: ws://localhost:${PORT}/ws     ║`);
    console.log(`  ║  Login:   demo@atheer.com               ║`);
    console.log(`  ║  Pass:    password123                   ║`);
    console.log(`  ║  DB:      ${userCount} users, ${marketCount} markets          ║`);
    console.log(`  ║  Exchange: ${process.env.CCXT_ENABLED !== 'false' ? 'Binance CCXT Live' : 'Local cache'}        ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

process.on('SIGINT', () => { stopWebSocket(); closeDb(); process.exit(0); });
process.on('SIGTERM', () => { stopWebSocket(); closeDb(); process.exit(0); });

export default app;

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getDb, entityTable, entityFilters, closeDb } from './server/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5173');
const STATIC_DIR = path.join(__dirname, 'dist');
const JWT_SECRET = process.env.JWT_SECRET || 'atheer-dev-secret-2026';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── JWT helpers ────────────────────────────────────────────────────
function signToken(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 900000 })).toString('base64url');
  const s = crypto.createHash('sha256').update(`${h}.${b}.${JWT_SECRET}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verifyToken(t) {
  try {
    const [h, b, s] = t.split('.');
    if (crypto.createHash('sha256').update(`${h}.${b}.${JWT_SECRET}`).digest('base64url') !== s) return null;
    return JSON.parse(Buffer.from(b, 'base64url').toString());
  } catch { return null; }
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = payload;
  next();
}

// ── Auth routes ────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const at = signToken({ sub: user.id, email: user.email, role: user.role });
  const rt = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (id, user_id, refresh_token) VALUES (?, ?, ?)').run(`sess-${Date.now()}`, user.id, rt);

  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, kycStatus: user.kyc_status, tier: user.tier },
    accessToken: at,
    refreshToken: rt,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = `user-${Date.now()}`;
  const refCode = `REF${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  db.prepare('INSERT INTO users (id, email, password_hash, full_name, referral_code) VALUES (?, ?, ?, ?, ?)').run(
    id, email, password, fullName || 'User', refCode
  );

  res.status(201).json({ user: { id, email, fullName: fullName || 'User', role: 'user', kycStatus: 'none', tier: 'bronze' } });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const db = getDb();
  const sess = db.prepare('SELECT * FROM sessions WHERE refresh_token = ?').get(refreshToken);
  if (!sess) return res.status(401).json({ error: 'Invalid refresh token' });

  db.prepare('DELETE FROM sessions WHERE id = ?').run(sess.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(sess.user_id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const at = signToken({ sub: user.id, email: user.email, role: user.role });
  const rt = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (id, user_id, refresh_token) VALUES (?, ?, ?)').run(`sess-${Date.now()}`, user.id, rt);

  res.json({ accessToken: at, refreshToken: rt });
});

app.get('/api/auth/me', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.put('/api/auth/profile', auth, (req, res) => {
  const db = getDb();
  const allowed = ['full_name', 'avatar'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(updates);
  db.prepare(`UPDATE users SET ${cols} WHERE id = ?`).run(...vals, req.user.sub);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
  res.json({ user });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.sub);
  res.json({ success: true });
});

// ── Markets ────────────────────────────────────────────────────────
app.get('/api/markets', (_req, res) => {
  const db = getDb();
  const markets = db.prepare('SELECT * FROM markets WHERE is_active = 1').all();
  res.json({ markets });
});

app.get('/api/markets/:symbol', (req, res) => {
  const db = getDb();
  const market = db.prepare('SELECT * FROM markets WHERE symbol = ?').get(req.params.symbol);
  if (!market) return res.status(404).json({ error: 'Market not found' });
  res.json({ market });
});

app.get('/api/markets/:symbol/orderbook', (_req, res) => {
  res.json({ bids: [[87000, 1.5], [86900, 2.3]], asks: [[87500, 1.2], [87600, 3.1]] });
});

app.get('/api/markets/:symbol/candles', (req, res) => {
  const tf = parseInt(req.query.timeframe) || 300;
  const limit = parseInt(req.query.limit) || 100;
  const now = Date.now();
  const candles = [];
  for (let i = limit - 1; i >= 0; i--) {
    const t = now - i * tf * 1000;
    const base = req.params.symbol === 'BTC/USDT' ? 87432.50 : 3921.80;
    const o = base + (Math.random() - 0.5) * base * 0.02;
    const c = o + (Math.random() - 0.5) * o * 0.01;
    candles.push({ time: Math.floor(t / 1000), open: o, high: Math.max(o, c) * 1.002, low: Math.min(o, c) * 0.998, close: c, volume: Math.random() * 1000 });
  }
  res.json({ candles });
});

app.get('/api/ticker', (_req, res) => {
  const db = getDb();
  const markets = db.prepare('SELECT symbol, price, change_24h FROM markets WHERE is_active = 1').all();
  const tickers = {};
  markets.forEach(m => { tickers[m.symbol] = { symbol: m.symbol, price: m.price, change24h: m.change_24h }; });
  res.json({ tickers });
});

// ── Orders ─────────────────────────────────────────────────────────
app.get('/api/orders', auth, (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  const params = [req.user.sub];

  if (req.query.symbol) { sql += ' AND symbol = ?'; params.push(req.query.symbol); }
  if (req.query.status) { sql += ' AND status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY created_at DESC';

  const orders = db.prepare(sql).all(...params);
  res.json({ orders });
});

app.post('/api/orders', auth, (req, res) => {
  const db = getDb();
  const { symbol, type, side, price, amount } = req.body;
  if (!symbol || !side || !amount) return res.status(400).json({ error: 'symbol, side, amount required' });

  const id = `ord-${Date.now()}`;
  const market = db.prepare('SELECT * FROM markets WHERE symbol = ?').get(symbol);
  const execPrice = type === 'market' ? (market ? market.price : price) : price;

  db.prepare('INSERT INTO orders (id, user_id, symbol, type, side, price, amount, filled, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, symbol, type || 'limit', side, parseFloat(execPrice || 0), parseFloat(amount), type === 'market' ? parseFloat(amount) : 0, type === 'market' ? 'filled' : 'open'
  );

  if (type === 'market') {
    const total = parseFloat(execPrice) * parseFloat(amount);
    const fee = total * 0.002;
    db.prepare('INSERT INTO trades (id, user_id, symbol, side, price, amount, total, fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      `tr-${Date.now()}`, req.user.sub, symbol, side, execPrice, parseFloat(amount), total, fee
    );
    db.prepare('UPDATE users SET total_volume_usd = total_volume_usd + ?, swaps_count = swaps_count + 1 WHERE id = ?').run(total, req.user.sub);
  }

  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
    `n-${Date.now()}`, req.user.sub, 'trade_filled', type === 'market' ? 'Order Executed' : 'Order Created',
    `${side.toUpperCase()} ${amount} ${symbol} @ $${execPrice} ${type === 'market' ? 'filled' : 'placed'}.`
  );

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.status(201).json({ order });
});

app.get('/api/orders/:id', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

app.delete('/api/orders/:id', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  res.json({ success: true });
});

// ── Trades ─────────────────────────────────────────────────────────
app.get('/api/trades', auth, (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM trades WHERE user_id = ?';
  const params = [req.user.sub];
  if (req.query.symbol) { sql += ' AND symbol = ?'; params.push(req.query.symbol); }
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }
  sql += ' ORDER BY created_at DESC';
  const trades = db.prepare(sql).all(...params);
  res.json({ trades });
});

// ── Wallets ────────────────────────────────────────────────────────
app.get('/api/wallets', auth, (req, res) => {
  const db = getDb();
  const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND is_fiat = 0').all(req.user.sub);
  res.json({ wallets });
});

app.post('/api/wallets/bootstrap', auth, (req, res) => {
  const db = getDb();
  const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND is_fiat = 0').all(req.user.sub);
  res.json({ wallets });
});

app.post('/api/wallets/deposit', auth, (req, res) => {
  const { currency, amount } = req.body;
  if (!currency || !amount) return res.status(400).json({ error: 'currency and amount required' });
  const db = getDb();
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ?').get(req.user.sub, currency);
  if (wallet) db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(parseFloat(amount), wallet.id);
  const updated = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ?').get(req.user.sub, currency);
  res.json({ wallet: updated });
});

app.get('/api/fiat-wallets', auth, (req, res) => {
  const db = getDb();
  const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND is_fiat = 1').all(req.user.sub);
  res.json({ wallets });
});

app.post('/api/fiat-wallets', auth, (req, res) => {
  const { currency, iban } = req.body;
  if (!currency) return res.status(400).json({ error: 'currency required' });
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ? AND is_fiat = 1').get(req.user.sub, currency);
  if (existing) return res.json({ wallet: existing });
  const id = `w-${Date.now()}`;
  db.prepare('INSERT INTO wallets (id, user_id, currency, balance, is_fiat, iban) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.sub, currency, 0, 1, iban || null);
  const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
  res.status(201).json({ wallet });
});

// ── Banking ────────────────────────────────────────────────────────
app.get('/api/banking/methods', (_req, res) => {
  const db = getDb();
  const methods = db.prepare('SELECT * FROM banking_methods').all();
  res.json({ methods });
});

app.get('/api/banking/transactions', auth, (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM banking_transactions WHERE user_id = ?';
  const params = [req.user.sub];
  if (req.query.status) { sql += ' AND status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY created_at DESC';
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }
  const transactions = db.prepare(sql).all(...params);
  res.json({ transactions });
});

app.post('/api/banking/deposit', auth, (req, res) => {
  const { method, amount, currency } = req.body;
  if (!method || !amount) return res.status(400).json({ error: 'method and amount required' });
  const db = getDb();
  const id = `bt-${Date.now()}`;
  db.prepare('INSERT INTO banking_transactions (id, user_id, method, type, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, method, 'deposit', parseFloat(amount), currency || 'USD', 'completed'
  );
  const cur = currency || 'USD';
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ? AND is_fiat = 1').get(req.user.sub, cur);
  if (wallet) db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(parseFloat(amount), wallet.id);
  const tx = db.prepare('SELECT * FROM banking_transactions WHERE id = ?').get(id);
  res.json({ transaction: tx });
});

app.post('/api/banking/withdraw', auth, (req, res) => {
  const { method, amount, currency } = req.body;
  if (!method || !amount) return res.status(400).json({ error: 'method and amount required' });
  const db = getDb();
  const cur = currency || 'USD';
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ? AND is_fiat = 1').get(req.user.sub, cur);
  if (wallet && wallet.balance < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });
  if (wallet) db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(parseFloat(amount), wallet.id);
  const id = `bt-${Date.now()}`;
  db.prepare('INSERT INTO banking_transactions (id, user_id, method, type, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, method, 'withdraw', parseFloat(amount), cur, 'completed'
  );
  const tx = db.prepare('SELECT * FROM banking_transactions WHERE id = ?').get(id);
  res.json({ transaction: tx });
});

app.post('/api/banking/transfer', auth, (req, res) => {
  const { fromCurrency, toCurrency, amount } = req.body;
  if (!fromCurrency || !toCurrency || !amount) return res.status(400).json({ error: 'fromCurrency, toCurrency, amount required' });
  const db = getDb();
  const fromW = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ? AND is_fiat = 1').get(req.user.sub, fromCurrency);
  if (!fromW || fromW.balance < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });
  db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(parseFloat(amount), fromW.id);
  const toW = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND currency = ? AND is_fiat = 1').get(req.user.sub, toCurrency);
  if (toW) db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(parseFloat(amount), toW.id);
  res.json({ success: true });
});

app.get('/api/banking/performance', auth, (req, res) => {
  res.json({ totalDeposits: 1250000, totalWithdrawals: 450000, totalTransfers: 320000 });
});

// ── KYC ────────────────────────────────────────────────────────────
app.post('/api/kyc/submit', auth, (req, res) => {
  const { type, documentData } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  const db = getDb();
  const id = `kyc-${Date.now()}`;
  db.prepare('INSERT INTO kyc_documents (id, user_id, type) VALUES (?, ?, ?)').run(id, req.user.sub, type);
  db.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').run('pending', req.user.sub);
  res.status(201).json({ document: { id, status: 'pending' } });
});

app.get('/api/kyc/status', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT kyc_status FROM users WHERE id = ?').get(req.user.sub);
  res.json({ status: user ? user.kyc_status : 'none' });
});

app.post('/api/kyc/:id/upload', auth, (req, res) => {
  res.json({ success: true, url: '/uploads/placeholder.jpg' });
});

// ── Futures ────────────────────────────────────────────────────────
app.get('/api/futures/positions', auth, (req, res) => {
  const db = getDb();
  const positions = db.prepare('SELECT * FROM futures_positions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.sub);
  res.json({ positions });
});

app.post('/api/futures/positions', auth, (req, res) => {
  const { symbol, side, size, leverage } = req.body;
  if (!symbol || !side || !size) return res.status(400).json({ error: 'symbol, side, size required' });
  const db = getDb();
  const market = db.prepare('SELECT * FROM markets WHERE symbol = ?').get(symbol);
  const price = market ? market.price : 50000;
  const lev = parseInt(leverage) || 1;
  const margin = (parseFloat(size) * price) / lev;
  const id = `fp-${Date.now()}`;
  db.prepare('INSERT INTO futures_positions (id, user_id, symbol, side, size, leverage, entry_price, mark_price, liquidation_price, pnl, margin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, symbol, side, parseFloat(size), lev, price, price, price * 0.9, 0, margin, 'open'
  );
  const pos = db.prepare('SELECT * FROM futures_positions WHERE id = ?').get(id);
  res.status(201).json({ position: pos });
});

app.get('/api/futures/positions/:id', auth, (req, res) => {
  const db = getDb();
  const pos = db.prepare('SELECT * FROM futures_positions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub);
  if (!pos) return res.status(404).json({ error: 'Position not found' });
  res.json({ position: pos });
});

app.put('/api/futures/positions/:id/close', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE futures_positions SET status = ? WHERE id = ? AND user_id = ?').run('closed', req.params.id, req.user.sub);
  res.json({ success: true });
});

app.post('/api/futures/leverage', auth, (req, res) => {
  res.json({ success: true, leverage: req.body.leverage || 1 });
});

// ── Trading Bots ───────────────────────────────────────────────────
app.get('/api/bots', auth, (req, res) => {
  const db = getDb();
  const bots = db.prepare('SELECT * FROM trading_bots WHERE user_id = ? ORDER BY created_at DESC').all(req.user.sub);
  res.json({ bots });
});

app.post('/api/bots', auth, (req, res) => {
  const { name, strategy, symbol, config } = req.body;
  if (!name || !strategy || !symbol) return res.status(400).json({ error: 'name, strategy, symbol required' });
  const db = getDb();
  const id = `bot-${Date.now()}`;
  db.prepare('INSERT INTO trading_bots (id, user_id, name, strategy, symbol, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, name, strategy, symbol, JSON.stringify(config || {}), 'stopped'
  );
  const bot = db.prepare('SELECT * FROM trading_bots WHERE id = ?').get(id);
  res.status(201).json({ bot });
});

app.put('/api/bots/:id', auth, (req, res) => {
  const db = getDb();
  const { name, strategy, symbol, config } = req.body;
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (strategy) { updates.push('strategy = ?'); params.push(strategy); }
  if (symbol) { updates.push('symbol = ?'); params.push(symbol); }
  if (config) { updates.push('config = ?'); params.push(JSON.stringify(config)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id, req.user.sub);
  db.prepare(`UPDATE trading_bots SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  const bot = db.prepare('SELECT * FROM trading_bots WHERE id = ?').get(req.params.id);
  res.json({ bot });
});

app.post('/api/bots/:id/start', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE trading_bots SET status = ? WHERE id = ? AND user_id = ?').run('running', req.params.id, req.user.sub);
  const bot = db.prepare('SELECT * FROM trading_bots WHERE id = ?').get(req.params.id);
  res.json({ bot });
});

app.post('/api/bots/:id/stop', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE trading_bots SET status = ? WHERE id = ? AND user_id = ?').run('stopped', req.params.id, req.user.sub);
  const bot = db.prepare('SELECT * FROM trading_bots WHERE id = ?').get(req.params.id);
  res.json({ bot });
});

app.delete('/api/bots/:id', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM trading_bots WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub);
  res.json({ success: true });
});

// ── Copy Trading ───────────────────────────────────────────────────
app.get('/api/copy-trading/traders', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM copy_traders WHERE is_active = 1';
  const params = [];
  if (req.query.minWinRate) { sql += ' AND win_rate >= ?'; params.push(parseFloat(req.query.minWinRate)); }
  if (req.query.maxRisk) { sql += ' AND risk_score <= ?'; params.push(parseInt(req.query.maxRisk)); }
  sql += ' ORDER BY followers DESC';
  const traders = db.prepare(sql).all(...params);
  res.json({ traders });
});

app.get('/api/copy-trading/traders/:id', (req, res) => {
  const db = getDb();
  const trader = db.prepare('SELECT * FROM copy_traders WHERE id = ?').get(req.params.id);
  if (!trader) return res.status(404).json({ error: 'Trader not found' });
  res.json({ trader });
});

app.get('/api/copy-trading/my-copies', auth, (req, res) => {
  const db = getDb();
  const copies = db.prepare(`
    SELECT c.*, ct.display_name, ct.total_pnl, ct.win_rate, ct.risk_score
    FROM copy_copies c JOIN copy_traders ct ON c.trader_id = ct.id
    WHERE c.user_id = ?
  `).all(req.user.sub);
  res.json({ copies });
});

app.post('/api/copy-trading/copy', auth, (req, res) => {
  const { traderId, allocation } = req.body;
  if (!traderId) return res.status(400).json({ error: 'traderId required' });
  const db = getDb();
  const id = `cc-${Date.now()}`;
  db.prepare('INSERT INTO copy_copies (id, user_id, trader_id, allocation) VALUES (?, ?, ?, ?)').run(
    id, req.user.sub, traderId, parseFloat(allocation || 100)
  );
  const copy = db.prepare('SELECT * FROM copy_copies WHERE id = ?').get(id);
  res.status(201).json({ copy });
});

app.put('/api/copy-trading/copy/:id/stop', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE copy_copies SET status = ? WHERE id = ? AND user_id = ?').run('stopped', req.params.id, req.user.sub);
  res.json({ success: true });
});

// ── Earn / Staking ─────────────────────────────────────────────────
app.get('/api/earn/products', (_req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM earn_products WHERE is_active = 1').all();
  res.json({ products });
});

app.post('/api/earn/stake', auth, (req, res) => {
  const { productId, amount } = req.body;
  if (!productId || !amount) return res.status(400).json({ error: 'productId and amount required' });
  const db = getDb();
  const product = db.prepare('SELECT * FROM earn_products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const id = `ep-${Date.now()}`;
  db.prepare('INSERT INTO earn_positions (id, user_id, product_id, type, amount, apr) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, productId, product.type, parseFloat(amount), product.apr
  );
  const position = db.prepare('SELECT * FROM earn_positions WHERE id = ?').get(id);
  res.status(201).json({ position });
});

app.get('/api/earn/positions', auth, (req, res) => {
  const db = getDb();
  const positions = db.prepare('SELECT * FROM earn_positions WHERE user_id = ? ORDER BY started_at DESC').all(req.user.sub);
  res.json({ positions });
});

app.post('/api/earn/liquidity', auth, (req, res) => {
  const { symbol, amount } = req.body;
  if (!symbol || !amount) return res.status(400).json({ error: 'symbol and amount required' });
  const db = getDb();
  const id = `ep-${Date.now()}`;
  db.prepare('INSERT INTO earn_positions (id, user_id, product_id, type, amount, apr) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.user.sub, `liq-${symbol}`, 'liquidity', parseFloat(amount), 12.5
  );
  const position = db.prepare('SELECT * FROM earn_positions WHERE id = ?').get(id);
  res.status(201).json({ position });
});

app.post('/api/earn/liquidity/:id/withdraw', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE earn_positions SET status = ? WHERE id = ? AND user_id = ?').run('withdrawn', req.params.id, req.user.sub);
  res.json({ success: true });
});

// ── Price Alerts ───────────────────────────────────────────────────
app.get('/api/price-alerts', auth, (req, res) => {
  const db = getDb();
  const alerts = db.prepare('SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC').all(req.user.sub);
  res.json({ alerts });
});

app.post('/api/price-alerts', auth, (req, res) => {
  const { symbol, targetPrice, direction } = req.body;
  if (!symbol || !targetPrice || !direction) return res.status(400).json({ error: 'symbol, targetPrice, direction required' });
  const db = getDb();
  const id = `pa-${Date.now()}`;
  db.prepare('INSERT INTO price_alerts (id, user_id, symbol, target_price, direction) VALUES (?, ?, ?, ?, ?)').run(
    id, req.user.sub, symbol, parseFloat(targetPrice), direction
  );
  const alert = db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(id);
  res.status(201).json({ alert });
});

app.put('/api/price-alerts/:id/toggle', auth, (req, res) => {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM price_alerts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.sub);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const newStatus = alert.status === 'active' ? 'paused' : 'active';
  db.prepare('UPDATE price_alerts SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ alert: { ...alert, status: newStatus } });
});

app.delete('/api/price-alerts/:id', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub);
  res.json({ success: true });
});

// ── AI Models ──────────────────────────────────────────────────────
app.get('/api/ai-models', (_req, res) => {
  res.json({
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
  });
});

// ── Liquidity Pools ───────────────────────────────────────────────
app.get('/api/liquidity/pools', (_req, res) => {
  res.json({
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
  });
});

// ── Rewards ────────────────────────────────────────────────────────
app.get('/api/rewards', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT referral_count, referral_bonus, tier FROM users WHERE id = ?').get(req.user.sub);
  res.json({
    points: (user?.referral_bonus || 0) * 2,
    tier: user?.tier || 'bronze',
    referralCount: user?.referral_count || 0,
    referralBonus: user?.referral_bonus || 0,
  });
});

// ── Notifications ──────────────────────────────────────────────────
app.get('/api/notifications', auth, (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 20;
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(req.user.sub, limit);
  res.json({ notifications });
});

app.put('/api/notifications/:id/read', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub);
  res.json({ success: true });
});

app.put('/api/notifications/read-all', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.sub);
  res.json({ success: true });
});

// ── Analytics ──────────────────────────────────────────────────────
app.get('/api/analytics/portfolio', auth, (req, res) => {
  const db = getDb();
  const totalBalance = db.prepare("SELECT COALESCE(SUM(balance * CASE WHEN currency = 'BTC' THEN (SELECT price FROM markets WHERE symbol = 'BTC/USDT') WHEN currency = 'ETH' THEN (SELECT price FROM markets WHERE symbol = 'ETH/USDT') WHEN currency = 'USDT' THEN 1 ELSE 0 END), 0) as total FROM wallets WHERE user_id = ? AND is_fiat = 0").get(req.user.sub);
  const fiatTotal = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = ? AND is_fiat = 1').get(req.user.sub);
  res.json({
    totalBalance: (totalBalance?.total || 0) + (fiatTotal?.total || 0),
    totalPnl24h: Math.random() * 5000 - 1000,
  });
});

app.get('/api/analytics/leaderboard', (_req, res) => {
  const db = getDb();
  const traders = db.prepare("SELECT id, display_name, total_pnl, win_rate, followers FROM copy_traders WHERE is_active = 1 ORDER BY total_pnl DESC LIMIT 10").all();
  res.json({ leaderboard: traders });
});

app.get('/api/analytics/volume-history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const history = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    history.push({ date: d.toISOString().slice(0, 10), volume: Math.random() * 50000000 + 10000000 });
  }
  res.json({ history });
});

// ── Admin ──────────────────────────────────────────────────────────
app.get('/api/admin/stats', (_req, res) => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalTrades = db.prepare('SELECT COUNT(*) as c FROM trades').get().c;
  const totalVolume = db.prepare('SELECT COALESCE(SUM(total), 0) as t FROM trades').get().t;
  res.json({ totalUsers, totalVolume24h: totalVolume, revenue24h: totalVolume * 0.002, totalTrades });
});

app.get('/api/admin/users', (_req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, full_name, role, kyc_status, tier, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100').all();
  res.json({ users });
});

app.put('/api/admin/users/:id', (req, res) => {
  const db = getDb();
  const { role, kyc_status, tier, is_active } = req.body;
  const updates = [];
  const params = [];
  if (role) { updates.push('role = ?'); params.push(role); }
  if (kyc_status) { updates.push('kyc_status = ?'); params.push(kyc_status); }
  if (tier) { updates.push('tier = ?'); params.push(tier); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ user });
});

app.get('/api/admin/threats', (_req, res) => {
  const db = getDb();
  const threats = db.prepare('SELECT * FROM threat_alerts ORDER BY created_at DESC').all();
  res.json({ threats });
});

app.put('/api/admin/threats/:id/resolve', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE threat_alerts SET resolved = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/audit-logs', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json({ logs });
});

app.post('/api/admin/scan', (_req, res) => {
  const threats = [
    { type: 'vulnerability', severity: 'low', title: 'SSL Certificate Expiring', description: 'SSL cert expires in 14 days', source_ip: null },
  ];
  res.json({ scanId: `scan-${Date.now()}`, threats, status: 'completed' });
});

// ── Entity Proxy (generic CRUD) ────────────────────────────────────
function handleEntity(req, res) {
  const db = getDb();
  const table = entityTable(req.params.name);
  if (!table) return res.status(400).json({ error: `Unknown entity: ${req.params.name}` });

  const filters = entityFilters(req.params.name, req.user.sub);
  const hasUserIdFilter = filters && filters.user_id !== undefined;

  const { id } = req.params;
  const method = req.method;

  if (method === 'GET' && id === 'filter') {
    let sql = `SELECT * FROM ${table} WHERE 1=1`;
    const params = [];
    if (hasUserIdFilter) { sql += ' AND user_id = ?'; params.push(req.user.sub); }
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== '_t') { sql += ` AND ${k} = ?`; params.push(v); }
    }
    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    return res.json({ data: rows });
  }

  if (method === 'GET' && !id) {
    let sql = `SELECT * FROM ${table} WHERE 1=1`;
    const params = [];
    if (hasUserIdFilter) { sql += ' AND user_id = ?'; params.push(req.user.sub); }
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== '_t') { sql += ` AND ${k} = ?`; params.push(v); }
    }
    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    return res.json({ data: rows });
  }

  if (method === 'GET' && id) {
    let sql = `SELECT * FROM ${table} WHERE id = ?`;
    const params = [id];
    if (hasUserIdFilter && table !== 'threat_alerts') { sql += ' AND user_id = ?'; params.push(req.user.sub); }
    const row = db.prepare(sql).get(...params);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: row });
  }

  if (method === 'POST') {
    const body = { ...req.body };
    if (hasUserIdFilter && !body.user_id) body.user_id = req.user.sub;
    if (!body.id) body.id = `${table}-${Date.now()}`;
    const cols = Object.keys(body);
    const placeholders = cols.map(() => '?');
    const vals = cols.map(k => body[k]);
    db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`).run(...vals);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(body.id);
    return res.status(201).json({ data: row });
  }

  if (method === 'PUT' && id) {
    const allowed = Object.keys(req.body).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
    if (allowed.length === 0) return res.status(400).json({ error: 'No fields to update' });
    const cols = allowed.map(k => `${k} = ?`).join(', ');
    const vals = allowed.map(k => req.body[k]);
    let sql = `UPDATE ${table} SET ${cols} WHERE id = ?`;
    const params = [id];
    if (hasUserIdFilter && table !== 'threat_alerts') { sql += ' AND user_id = ?'; params.push(req.user.sub); }
    db.prepare(sql).run(...vals, ...params);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    return res.json({ data: row });
  }

  if (method === 'DELETE' && id) {
    let sql = `DELETE FROM ${table} WHERE id = ?`;
    const params = [id];
    if (hasUserIdFilter) { sql += ' AND user_id = ?'; params.push(req.user.sub); }
    db.prepare(sql).run(...params);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

app.all('/api/entities/:name', auth, handleEntity);
app.all('/api/entities/:name/:id', auth, handleEntity);

// ── Functions invoke ───────────────────────────────────────────────
const functions = {
  getLiveMarketData: () => {
    const db = getDb();
    return { markets: db.prepare('SELECT * FROM markets WHERE is_active = 1').all(), timestamp: Date.now() };
  },
  aiTradingSignals: () => ({
    signals: [
      { symbol: 'BTC/USDT', signal: 'strong_buy', confidence: 87, reason: 'Golden cross detected on 4H chart with high volume' },
      { symbol: 'ETH/USDT', signal: 'buy', confidence: 72, reason: 'RSI oversold bounce' },
      { symbol: 'SOL/USDT', signal: 'sell', confidence: 65, reason: 'Resistance at $192' },
    ]
  }),
  bankTransfer: (args) => ({ success: true, transferId: `trf-${Date.now()}`, ...args }),
  submitContactMessage: () => ({ success: true, message: 'Your message has been received.' }),
  getMarketIntelligence: () => ({
    news: [
      { title: 'BTC holds above $87K as institutional inflows continue', sentiment: 'bullish', source: 'CoinDesk', time: Date.now() - 3600000 },
      { title: 'Ethereum Pectra upgrade scheduled for Q3 2026', sentiment: 'bullish', source: 'The Block', time: Date.now() - 7200000 },
    ],
    onChainMetrics: { btcExchangeInflows: -12.5, stablecoinSupply: 182.4 },
  }),
  manageOKXOrders: () => ({ orders: [], total: 0 }),
  executeOKXTrade: () => ({ success: true, orderId: `okx-${Date.now()}` }),
  executeTrade: (args) => {
    const db = getDb();
    const id = `ord-${Date.now()}`;
    db.prepare('INSERT INTO orders (id, user_id, symbol, type, side, price, amount, filled, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, 'user-1', args.symbol || 'BTC/USDT', 'market', args.side || 'buy', args.price || 87432.50, parseFloat(args.amount || 0), parseFloat(args.amount || 0), 'filled'
    );
    return { success: true, orderId: id };
  },
  generateThreatAlerts: () => {
    const db = getDb();
    return { threats: db.prepare('SELECT * FROM threat_alerts WHERE resolved = 0 ORDER BY created_at DESC LIMIT 5').all() };
  },
  militaryCrypto: () => ({ status: 'active', algorithms: ['AES-256-GCM', 'ChaCha20-Poly1305'], keyStrength: 256 }),
  manage2FA: (args) => ({ success: true, enabled: args?.enable || false }),
  submitKYC: (args) => {
    const db = getDb();
    db.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').run('pending', 'user-1');
    return { success: true, status: 'pending' };
  },
  manageOKXKeys: (args) => ({ success: true, configured: !!args?.apiKey }),
};

app.post('/api/functions/invoke', auth, (req, res) => {
  const { functionName, args } = req.body;
  if (!functionName || !functions[functionName]) return res.status(404).json({ error: `Function ${functionName} not found` });
  try {
    const result = functions[functionName](args);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────
app.get(['/api/health', '/api/healthz'], (_req, res) => {
  const db = getDb();
  try { db.prepare('SELECT 1').get(); res.json({ status: 'ok', uptime: process.uptime() }); }
  catch { res.status(503).json({ status: 'error' }); }
});

app.get('/api/ping', (_req, res) => res.json({ pong: true }));

// ── Static file serving ────────────────────────────────────────────
app.use(express.static(STATIC_DIR, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
}));

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Not found');
});

// ── Start ──────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  const db = getDb();
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  ATHEER Global Platform                 ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║  Mode:    Production (SQLite Database)  ║`);
  console.log(`  ║  Server:  http://localhost:${PORT}        ║`);
  console.log(`  ║  Login:   demo@atheer.com               ║`);
  console.log(`  ║  Pass:    password123                   ║`);
  console.log(`  ║  DB:      atheer.db (${db.prepare('SELECT COUNT(*) as u FROM users').get().u} users, ${db.prepare('SELECT COUNT(*) as m FROM markets').get().m} markets)║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});

process.on('SIGINT', () => { closeDb(); server.close(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); server.close(); process.exit(0); });

export default app;

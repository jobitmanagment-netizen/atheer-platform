import http from 'http';
import fs from 'fs';
import path from 'path';
import { randomBytes, createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;
const STATIC_DIR = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const JWT_SECRET = 'dev-secret-key-for-local-only';
const now = Date.now();

// ── In-memory data stores ────────────────────────────────────────────
const users = [{ id: 'user-1', email: 'demo@atheer.com', fullName: 'Demo User', password: 'password123', kycStatus: 'verified', role: 'user', tier: 'platinum', referralCode: 'DEMO123', referralCount: 15, referralBonus: 2500, createdAt: new Date().toISOString(), avatar: null, twoFactorEnabled: false, isActive: true }];
const sessions = {};

function signToken(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 900000 })).toString('base64url');
  const s = createHash('sha256').update(`${h}.${b}.${JWT_SECRET}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verifyToken(t) {
  try { const [h, b, s] = t.split('.'); if (createHash('sha256').update(`${h}.${b}.${JWT_SECRET}`).digest('base64url') !== s) return null; return JSON.parse(Buffer.from(b, 'base64url').toString()); } catch { return null; }
}

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
  res.end(JSON.stringify(data));
}

function body(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d ? JSON.parse(d) : {})); }); }

function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const p = verifyToken(auth.replace('Bearer ', ''));
  return p ? users.find(u => u.id === p.sub) || null : null;
}

// ── Mock data ───────────────────────────────────────────────────────
const markets = [
  { id: 'BTC/USDT', symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', price: 87432.50, change24h: 2.34, high24h: 88900, low24h: 85400, volume24h: 28450000000, marketCap: 1720000000000, isActive: true },
  { id: 'ETH/USDT', symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', price: 3921.80, change24h: 1.87, high24h: 3980, low24h: 3850, volume24h: 15800000000, marketCap: 472000000000, isActive: true },
  { id: 'SOL/USDT', symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', price: 187.45, change24h: 5.62, high24h: 192, low24h: 177.50, volume24h: 4200000000, marketCap: 84000000000, isActive: true },
  { id: 'XRP/USDT', symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT', price: 0.7215, change24h: -0.43, high24h: 0.735, low24h: 0.718, volume24h: 2100000000, marketCap: 39500000000, isActive: true },
  { id: 'ADA/USDT', symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT', price: 0.6721, change24h: 3.21, high24h: 0.690, low24h: 0.651, volume24h: 980000000, marketCap: 23800000000, isActive: true },
  { id: 'DOT/USDT', symbol: 'DOT/USDT', base: 'DOT', quote: 'USDT', price: 8.94, change24h: -1.25, high24h: 9.15, low24h: 8.82, volume24h: 520000000, marketCap: 12400000000, isActive: true },
  { id: 'AVAX/USDT', symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', price: 38.72, change24h: 4.15, high24h: 39.50, low24h: 37.20, volume24h: 890000000, marketCap: 14600000000, isActive: true },
  { id: 'LINK/USDT', symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', price: 18.34, change24h: 0.85, high24h: 18.65, low24h: 18.10, volume24h: 410000000, marketCap: 10800000000, isActive: true },
  { id: 'MATIC/USDT', symbol: 'MATIC/USDT', base: 'MATIC', quote: 'USDT', price: 0.8934, change24h: 2.78, high24h: 0.91, low24h: 0.869, volume24h: 380000000, marketCap: 8300000000, isActive: true },
  { id: 'UNI/USDT', symbol: 'UNI/USDT', base: 'UNI', quote: 'USDT', price: 7.68, change24h: -0.52, high24h: 7.82, low24h: 7.55, volume24h: 210000000, marketCap: 4600000000, isActive: true },
  { id: 'ATOM/USDT', symbol: 'ATOM/USDT', base: 'ATOM', quote: 'USDT', price: 11.23, change24h: 1.45, high24h: 11.45, low24h: 11.08, volume24h: 190000000, marketCap: 4400000000, isActive: true },
  { id: 'LTC/USDT', symbol: 'LTC/USDT', base: 'LTC', quote: 'USDT', price: 84.56, change24h: 0.23, high24h: 85.20, low24h: 83.90, volume24h: 340000000, marketCap: 6300000000, isActive: true },
];
const wallets = [
  { id: 'w-btc', userId: 'user-1', currency: 'BTC', balance: 1.5243, locked: 0, isFiat: false, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
  { id: 'w-eth', userId: 'user-1', currency: 'ETH', balance: 25.678, locked: 2, isFiat: false, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' },
  { id: 'w-usdt', userId: 'user-1', currency: 'USDT', balance: 50000, locked: 10000, isFiat: false, address: null },
  { id: 'w-sol', userId: 'user-1', currency: 'SOL', balance: 150, locked: 0, isFiat: false, address: null },
  { id: 'w-xrp', userId: 'user-1', currency: 'XRP', balance: 5000, locked: 0, isFiat: false, address: null },
  { id: 'w-usd', userId: 'user-1', currency: 'USD', balance: 250000, locked: 0, isFiat: true, iban: 'AE070331234567890123456' },
  { id: 'w-eur', userId: 'user-1', currency: 'EUR', balance: 100000, locked: 0, isFiat: true, iban: 'DE89370400440532013000' },
  { id: 'w-gbp', userId: 'user-1', currency: 'GBP', balance: 50000, locked: 0, isFiat: true, iban: 'GB29NWBK60161331926819' },
  { id: 'w-aed', userId: 'user-1', currency: 'AED', balance: 500000, locked: 0, isFiat: true, iban: 'AE070331234567890123456' },
  { id: 'w-sar', userId: 'user-1', currency: 'SAR', balance: 300000, locked: 0, isFiat: true, iban: 'SA0380000000608010167519' },
];
const orders = [
  { id: 'ord-1', userId: 'user-1', symbol: 'BTC/USDT', type: 'limit', side: 'buy', price: 86000, amount: 0.5, filled: 0.5, status: 'filled', createdAt: new Date(now - 86400000).toISOString() },
  { id: 'ord-2', userId: 'user-1', symbol: 'ETH/USDT', type: 'limit', side: 'sell', price: 4000, amount: 5, filled: 0, status: 'open', createdAt: new Date(now - 43200000).toISOString() },
  { id: 'ord-3', userId: 'user-1', symbol: 'SOL/USDT', type: 'market', side: 'buy', price: 187.45, amount: 10, filled: 10, status: 'filled', createdAt: new Date(now - 21600000).toISOString() },
];
const trades = [{ id: 'tr-1', userId: 'user-1', symbol: 'BTC/USDT', side: 'buy', price: 86000, amount: 0.5, total: 43000, fee: 86, pnl: null, createdAt: new Date(now - 86400000).toISOString() }];
const notifications = [
  { id: 'n-1', userId: 'user-1', type: 'trade_filled', title: 'Order Filled', message: 'BUY 0.5 BTC @ $86,000 filled.', read: false, createdAt: new Date(now - 3600000).toISOString() },
  { id: 'n-2', userId: 'user-1', type: 'price_alert', title: 'BTC at $87,432', message: 'BTC/USDT hit +2.34%', read: false, createdAt: new Date(now - 7200000).toISOString() },
];
const futuresPositions = [
  { id: 'fp-1', userId: 'user-1', symbol: 'BTC/USDT', side: 'long', size: 0.5, leverage: 10, entryPrice: 85000, markPrice: 87432.50, liquidationPrice: 76500, pnl: 1216.25, pnlPercent: 28.62, margin: 4250, status: 'open', createdAt: new Date(now - 172800000).toISOString() },
];
const tradingBots = [{ id: 'bot-1', userId: 'user-1', name: 'BTC Grid Bot', strategy: 'grid', symbol: 'BTC/USDT', status: 'running', pnl24h: 325.50, totalPnl: 2450, createdAt: new Date(now - 604800000).toISOString() }];
const copyTraders = [
  { id: 'ct-1', userId: 'trader-1', displayName: 'CryptoWhale', totalPnl: 125000, winRate: 78.5, totalTrades: 342, followers: 1520, riskScore: 3, isActive: true, createdAt: new Date(now - 2592000000).toISOString() },
  { id: 'ct-2', userId: 'trader-2', displayName: 'ScalpMaster', totalPnl: 45000, winRate: 82.3, totalTrades: 891, followers: 780, riskScore: 5, isActive: true, createdAt: new Date(now - 2592000000).toISOString() },
];

// ── HTTP Server ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400' });
    return res.end();
  }

  try {
    // ── API Routes ─────────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      await handleApi(url, pathname, method, req, res);
      return;
    }

    // ── Static Files ───────────────────────────────────────────
    let filePath = pathname === '/' ? '/index.html' : pathname;
    if (!path.extname(filePath)) filePath = '/index.html';
    const fullPath = path.join(STATIC_DIR, filePath);
    if (!fullPath.startsWith(STATIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

    const content = await fs.promises.readFile(fullPath).catch(() => null);
    if (content) {
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return res.end(content);
    }

    // SPA fallback
    const indexHtml = await fs.promises.readFile(path.join(STATIC_DIR, 'index.html')).catch(() => null);
    if (indexHtml) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(indexHtml); }

    res.writeHead(404);
    res.end('Not found');

  } catch (err) {
    console.error('Server error:', err);
    json(res, 500, { error: 'Internal error' });
  }
});

async function handleApi(url, pathname, method, req, res) {
  // ── Auth ──────────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && method === 'POST') {
    const b = await body(req);
    const user = users.find(u => u.email === b.email);
    if (!user || user.password !== b.password) return json(res, 401, { error: 'Invalid credentials' });
    const at = signToken({ sub: user.id, email: user.email, role: user.role });
    const rt = randomBytes(32).toString('hex');
    sessions[rt] = { userId: user.id, createdAt: Date.now() };
    return json(res, 200, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, kycStatus: user.kycStatus, tier: user.tier }, accessToken: at, refreshToken: rt });
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const b = await body(req);
    if (users.find(u => u.email === b.email)) return json(res, 409, { error: 'Email exists' });
    users.push({ id: `user-${users.length + 1}`, email: b.email, fullName: b.fullName || 'User', password: b.password, kycStatus: 'pending', role: 'user', tier: 'bronze', referralCode: `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`, referralCount: 0, referralBonus: 0, createdAt: new Date().toISOString(), avatar: null, twoFactorEnabled: false, isActive: true });
    return json(res, 201, { user: users[users.length - 1] });
  }

  if (pathname === '/api/auth/refresh' && method === 'POST') {
    const b = await body(req);
    const sess = sessions[b.refreshToken];
    if (!sess) return json(res, 401, { error: 'Invalid refresh' });
    delete sessions[b.refreshToken];
    const user = users.find(u => u.id === sess.userId);
    if (!user) return json(res, 401, { error: 'User not found' });
    const at = signToken({ sub: user.id, email: user.email, role: user.role });
    const rt = randomBytes(32).toString('hex');
    sessions[rt] = { userId: user.id, createdAt: Date.now() };
    return json(res, 200, { accessToken: at, refreshToken: rt });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = getUser(req);
    if (!user) return json(res, 401, { error: 'Unauthorized' });
    return json(res, 200, { user });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return json(res, 200, { success: true });
  }

  // ── Markets ──────────────────────────────────────────────────
  if (pathname === '/api/markets' && method === 'GET') return json(res, 200, { markets });

  const mktSymbol = pathname.match(/^\/api\/markets\/(\w+\/\w+)$/);
  if (mktSymbol && method === 'GET') {
    const m = markets.find(m => m.symbol === mktSymbol[1].replace('%2F', '/'));
    return m ? json(res, 200, { market: m }) : json(res, 404, { error: 'Not found' });
  }

  if (pathname === '/api/ticker' && method === 'GET') {
    const t = {}; markets.forEach(m => { t[m.symbol] = { symbol: m.symbol, price: m.price, change24h: m.change24h }; });
    return json(res, 200, { tickers: t });
  }

  // ── Orders ───────────────────────────────────────────────────
  if (pathname === '/api/orders' && method === 'GET') return json(res, 200, { orders: getUser(req) ? orders.filter(o => o.userId === getUser(req).id) : [] });
  if (pathname === '/api/orders' && method === 'POST') {
    const user = getUser(req); if (!user) return json(res, 401, { error: 'Unauthorized' });
    const b = await body(req);
    const o = { id: `ord-${Date.now()}`, userId: user.id, symbol: b.symbol, type: b.type || 'limit', side: b.side, price: b.price, amount: b.amount, filled: 0, status: 'open', createdAt: new Date().toISOString() };
    orders.unshift(o); return json(res, 201, { order: o });
  }

  // ── Wallets ──────────────────────────────────────────────────
  if (pathname === '/api/wallets' && method === 'GET') return json(res, 200, { wallets: getUser(req) ? wallets.filter(w => w.userId === getUser(req).id && !w.isFiat) : [] });
  if (pathname === '/api/fiat-wallets' && method === 'GET') return json(res, 200, { wallets: getUser(req) ? wallets.filter(w => w.userId === getUser(req).id && w.isFiat) : [] });
  if (pathname === '/api/wallets/bootstrap' && method === 'POST') return json(res, 200, { wallets: wallets.filter(w => !w.isFiat) });

  // ── Banking ──────────────────────────────────────────────────
  if (pathname === '/api/banking/methods' && method === 'GET') return json(res, 200, { methods: [{ id: 'swift', name: 'SWIFT', fee: 25 }, { id: 'sepa', name: 'SEPA', fee: 2 }, { id: 'ach', name: 'ACH', fee: 0 }] });
  if (pathname === '/api/banking/transactions' && method === 'GET') return json(res, 200, { transactions: [] });

  // ── Futures ──────────────────────────────────────────────────
  if (pathname === '/api/futures/positions' && method === 'GET') return json(res, 200, { positions: getUser(req) ? futuresPositions.filter(p => p.userId === getUser(req).id) : [] });

  // ── Bots ─────────────────────────────────────────────────────
  if (pathname === '/api/bots' && method === 'GET') return json(res, 200, { bots: getUser(req) ? tradingBots.filter(b => b.userId === getUser(req).id) : [] });

  // ── Copy Trading ─────────────────────────────────────────────
  if (pathname === '/api/copy-trading/traders' && method === 'GET') return json(res, 200, { traders: copyTraders });

  // ── Notifications ────────────────────────────────────────────
  if (pathname === '/api/notifications' && method === 'GET') { 
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    return json(res, 200, { notifications: getUser(req) ? notifications.filter(n => n.userId === getUser(req).id).slice(0, limit) : [] });
  }

  // ── Rewards ──────────────────────────────────────────────────
  if (pathname === '/api/rewards' && method === 'GET') return json(res, 200, { points: 12500, tier: 'platinum' });

  // ── Analytics ────────────────────────────────────────────────
  if (pathname === '/api/analytics/portfolio' && method === 'GET') return json(res, 200, { totalBalance: 523450.75, totalPnl24h: 2890.50 });

  // ── Price Alerts ─────────────────────────────────────────────
  if (pathname === '/api/price-alerts' && method === 'GET') return json(res, 200, { alerts: [] });

  // ── Earn / Staking ───────────────────────────────────────────
  if (pathname === '/api/earn/products' && method === 'GET') return json(res, 200, { products: [{ id: 'sp-1', name: 'BTC Staking', apr: 3.5 }, { id: 'sp-3', name: 'USDT 90-Day', apr: 8.5 }] });
  if (pathname === '/api/earn/positions' && method === 'GET') return json(res, 200, { positions: [] });

  // ── KYC ──────────────────────────────────────────────────────
  if (pathname === '/api/kyc/status' && method === 'GET') return json(res, 200, { status: 'verified' });

  // ── Admin ────────────────────────────────────────────────────
  if (pathname === '/api/admin/stats' && method === 'GET') return json(res, 200, { totalUsers: 28451, totalVolume24h: 3450000000, revenue24h: 1250000 });

  // ── Health ───────────────────────────────────────────────────
  if (pathname === '/api/health' || pathname === '/api/healthz') return json(res, 200, { status: 'ok', uptime: process.uptime() });

  // ── Entity (legacy) ─────────────────────────────────────────
  if (pathname.match(/^\/api\/entities\//)) return json(res, 200, { data: [] });

  json(res, 404, { error: 'Not found', path: pathname });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  ATHEER Global Platform                 ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║  Server:   http://localhost:${PORT}        ║`);
  console.log(`  ║  Login:    demo@atheer.com               ║`);
  console.log(`  ║  Password: password123                   ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});

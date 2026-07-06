// Standalone mock server for local frontend development
// Runs when PostgreSQL is unavailable
import http from 'http';
import { randomBytes, createHash } from 'crypto';

const PORT = 8080;
const JWT_SECRET = 'dev-secret-key-for-local-only';

// In-memory stores
const users = [{
  id: 'user-1',
  email: 'demo@atheer.com',
  fullName: 'Demo User',
  password: 'password123',
  kycStatus: 'verified',
  role: 'user',
  tier: 'platinum',
  referralCode: 'DEMO123',
  referralCount: 15,
  referralBonus: 2500,
  createdAt: new Date().toISOString(),
  avatar: null,
  twoFactorEnabled: false,
  isActive: true
}];

const sessions = {};
const accessTokens = {};

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 900000 })).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${body}.${JWT_SECRET}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(t) {
  try {
    const [h, b, s] = t.split('.');
    const sig = createHash('sha256').update(`${h}.${b}.${JWT_SECRET}`).digest('base64url');
    if (sig !== s) return null;
    return JSON.parse(Buffer.from(b, 'base64url').toString());
  } catch { return null; }
}

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => resolve(d ? JSON.parse(d) : {}));
  });
}

function getUser(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const tok = auth.replace('Bearer ', '');
  const payload = verifyToken(tok);
  if (!payload) return null;
  return users.find(u => u.id === payload.sub) || null;
}

// Generate realistic mock data
const now = Date.now();
const markets = [
  { id: 'BTC/USDT', symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', price: 87432.50, change24h: 2.34, high24h: 88900.00, low24h: 85400.00, volume24h: 28450000000, marketCap: 1720000000000, isActive: true },
  { id: 'ETH/USDT', symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', price: 3921.80, change24h: 1.87, high24h: 3980.00, low24h: 3850.00, volume24h: 15800000000, marketCap: 472000000000, isActive: true },
  { id: 'SOL/USDT', symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', price: 187.45, change24h: 5.62, high24h: 192.00, low24h: 177.50, volume24h: 4200000000, marketCap: 84000000000, isActive: true },
  { id: 'XRP/USDT', symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT', price: 0.7215, change24h: -0.43, high24h: 0.7350, low24h: 0.7180, volume24h: 2100000000, marketCap: 39500000000, isActive: true },
  { id: 'ADA/USDT', symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT', price: 0.6721, change24h: 3.21, high24h: 0.6900, low24h: 0.6510, volume24h: 980000000, marketCap: 23800000000, isActive: true },
  { id: 'DOT/USDT', symbol: 'DOT/USDT', base: 'DOT', quote: 'USDT', price: 8.94, change24h: -1.25, high24h: 9.15, low24h: 8.82, volume24h: 520000000, marketCap: 12400000000, isActive: true },
  { id: 'AVAX/USDT', symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', price: 38.72, change24h: 4.15, high24h: 39.50, low24h: 37.20, volume24h: 890000000, marketCap: 14600000000, isActive: true },
  { id: 'LINK/USDT', symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', price: 18.34, change24h: 0.85, high24h: 18.65, low24h: 18.10, volume24h: 410000000, marketCap: 10800000000, isActive: true },
  { id: 'MATIC/USDT', symbol: 'MATIC/USDT', base: 'MATIC', quote: 'USDT', price: 0.8934, change24h: 2.78, high24h: 0.9100, low24h: 0.8690, volume24h: 380000000, marketCap: 8300000000, isActive: true },
  { id: 'UNI/USDT', symbol: 'UNI/USDT', base: 'UNI', quote: 'USDT', price: 7.68, change24h: -0.52, high24h: 7.82, low24h: 7.55, volume24h: 210000000, marketCap: 4600000000, isActive: true },
  { id: 'ATOM/USDT', symbol: 'ATOM/USDT', base: 'ATOM', quote: 'USDT', price: 11.23, change24h: 1.45, high24h: 11.45, low24h: 11.08, volume24h: 190000000, marketCap: 4400000000, isActive: true },
  { id: 'LTC/USDT', symbol: 'LTC/USDT', base: 'LTC', quote: 'USDT', price: 84.56, change24h: 0.23, high24h: 85.20, low24h: 83.90, volume24h: 340000000, marketCap: 6300000000, isActive: true },
];

const wallets = [
  { id: 'w-btc', userId: 'user-1', currency: 'BTC', balance: 1.5243, locked: 0.0, isFiat: false, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
  { id: 'w-eth', userId: 'user-1', currency: 'ETH', balance: 25.678, locked: 2.0, isFiat: false, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' },
  { id: 'w-usdt', userId: 'user-1', currency: 'USDT', balance: 50000, locked: 10000, isFiat: false, address: null },
  { id: 'w-sol', userId: 'user-1', currency: 'SOL', balance: 150.0, locked: 0, isFiat: false, address: null },
  { id: 'w-xrp', userId: 'user-1', currency: 'XRP', balance: 5000, locked: 0, isFiat: false, address: null },
  { id: 'w-usd', userId: 'user-1', currency: 'USD', balance: 250000, locked: 0, isFiat: true, iban: 'AE070331234567890123456' },
  { id: 'w-eur', userId: 'user-1', currency: 'EUR', balance: 100000, locked: 0, isFiat: true, iban: 'DE89370400440532013000' },
  { id: 'w-gbp', userId: 'user-1', currency: 'GBP', balance: 50000, locked: 0, isFiat: true, iban: 'GB29NWBK60161331926819' },
  { id: 'w-aed', userId: 'user-1', currency: 'AED', balance: 500000, locked: 0, isFiat: true, iban: 'AE070331234567890123456' },
  { id: 'w-sar', userId: 'user-1', currency: 'SAR', balance: 300000, locked: 0, isFiat: true, iban: 'SA0380000000608010167519' },
];

const orders = [
  { id: 'ord-1', userId: 'user-1', symbol: 'BTC/USDT', type: 'limit', side: 'buy', price: 86000, amount: 0.5, filled: 0.5, status: 'filled', createdAt: new Date(now - 86400000).toISOString() },
  { id: 'ord-2', userId: 'user-1', symbol: 'ETH/USDT', type: 'limit', side: 'sell', price: 4000, amount: 5.0, filled: 0, status: 'open', createdAt: new Date(now - 43200000).toISOString() },
  { id: 'ord-3', userId: 'user-1', symbol: 'SOL/USDT', type: 'market', side: 'buy', price: 187.45, amount: 10, filled: 10, status: 'filled', createdAt: new Date(now - 21600000).toISOString() },
  { id: 'ord-4', userId: 'user-1', symbol: 'BTC/USDT', type: 'stop_limit', side: 'sell', price: 85000, amount: 0.3, filled: 0, status: 'open', createdAt: new Date(now - 7200000).toISOString() },
];

const trades = [
  { id: 'tr-1', userId: 'user-1', symbol: 'BTC/USDT', side: 'buy', price: 86000, amount: 0.5, total: 43000, fee: 86, pnl: null, createdAt: new Date(now - 86400000).toISOString() },
  { id: 'tr-2', userId: 'user-1', symbol: 'SOL/USDT', side: 'buy', price: 187.45, amount: 10, total: 1874.5, fee: 3.75, pnl: null, createdAt: new Date(now - 21600000).toISOString() },
  { id: 'tr-3', userId: 'user-1', symbol: 'ETH/USDT', side: 'sell', price: 3950, amount: 2.0, total: 7900, fee: 15.80, pnl: 120.50, createdAt: new Date(now - 3600000).toISOString() },
];

const notifications = [
  { id: 'n-1', userId: 'user-1', type: 'trade_filled', title: 'Order Filled', message: 'Your BUY order for 0.5 BTC/USDT @ $86,000 has been filled.', read: false, createdAt: new Date(now - 3600000).toISOString() },
  { id: 'n-2', userId: 'user-1', type: 'price_alert', title: 'Price Alert Triggered', message: 'BTC/USDT has reached $87,432.50 (+2.34%)', read: false, createdAt: new Date(now - 7200000).toISOString() },
  { id: 'n-3', userId: 'user-1', type: 'deposit', title: 'Deposit Confirmed', message: 'Your deposit of 25,000 USDT has been confirmed.', read: true, createdAt: new Date(now - 86400000).toISOString() },
  { id: 'n-4', userId: 'user-1', type: 'staking', title: 'Staking Reward', message: 'You received 12.5 USDT in staking rewards.', read: true, createdAt: new Date(now - 172800000).toISOString() },
  { id: 'n-5', userId: 'user-1', type: 'system', title: 'Security Update', message: 'Two-factor authentication is recommended for your account.', read: false, createdAt: new Date(now - 259200000).toISOString() },
];

const futuresPositions = [
  { id: 'fp-1', userId: 'user-1', symbol: 'BTC/USDT', side: 'long', size: 0.5, leverage: 10, entryPrice: 85000, markPrice: 87432.50, liquidationPrice: 76500, pnl: 1216.25, pnlPercent: 28.62, margin: 4250, status: 'open', createdAt: new Date(now - 172800000).toISOString() },
  { id: 'fp-2', userId: 'user-1', symbol: 'ETH/USDT', side: 'short', size: 10, leverage: 5, entryPrice: 3980, markPrice: 3921.80, liquidationPrice: 4378, pnl: 582.00, pnlPercent: 14.62, margin: 7960, status: 'open', createdAt: new Date(now - 86400000).toISOString() },
];

const stakingProducts = [
  { id: 'sp-1', name: 'BTC Flexible Staking', currency: 'BTC', apr: 3.5, minAmount: 0.01, durationDays: 0, type: 'flexible', totalStaked: 2500, capacity: 5000 },
  { id: 'sp-2', name: 'ETH Fixed 30-Day', currency: 'ETH', apr: 5.2, minAmount: 0.1, durationDays: 30, type: 'fixed', totalStaked: 45000, capacity: 100000 },
  { id: 'sp-3', name: 'USDT Fixed 90-Day', currency: 'USDT', apr: 8.5, minAmount: 100, durationDays: 90, type: 'fixed', totalStaked: 12500000, capacity: 25000000 },
  { id: 'sp-4', name: 'SOL Flexible Staking', currency: 'SOL', apr: 6.8, minAmount: 1, durationDays: 0, type: 'flexible', totalStaked: 850000, capacity: 2000000 },
  { id: 'sp-5', name: 'USDT Fixed 180-Day', currency: 'USDT', apr: 12.0, minAmount: 500, durationDays: 180, type: 'fixed', totalStaked: 8500000, capacity: 20000000 },
];

const priceAlerts = [
  { id: 'pa-1', userId: 'user-1', symbol: 'BTC/USDT', condition: 'above', price: 90000, triggered: false, active: true, createdAt: new Date(now - 86400000).toISOString() },
  { id: 'pa-2', userId: 'user-1', symbol: 'ETH/USDT', condition: 'below', price: 3800, triggered: false, active: true, createdAt: new Date(now - 43200000).toISOString() },
];

const tradingBots = [
  { id: 'bot-1', userId: 'user-1', name: 'BTC Grid Bot', strategy: 'grid', symbol: 'BTC/USDT', status: 'running', pnl24h: 325.50, totalPnl: 2450.00, createdAt: new Date(now - 604800000).toISOString() },
  { id: 'bot-2', userId: 'user-1', name: 'ETH DCA Bot', strategy: 'dca', symbol: 'ETH/USDT', status: 'paused', pnl24h: 0, totalPnl: 890.00, createdAt: new Date(now - 1209600000).toISOString() },
];

const copyTraders = [
  { id: 'ct-1', userId: 'trader-1', displayName: 'CryptoWhale', totalPnl: 125000, winRate: 78.5, totalTrades: 342, followers: 1520, riskScore: 3, isActive: true, createdAt: new Date(now - 2592000000).toISOString() },
  { id: 'ct-2', userId: 'trader-2', displayName: 'ScalpMaster', totalPnl: 45000, winRate: 82.3, totalTrades: 891, followers: 780, riskScore: 5, isActive: true, createdAt: new Date(now - 2592000000).toISOString() },
  { id: 'ct-3', userId: 'trader-3', displayName: 'LongTermHodl', totalPnl: 340000, winRate: 71.2, totalTrades: 56, followers: 3400, riskScore: 2, isActive: true, createdAt: new Date(now - 7776000000).toISOString() },
  { id: 'ct-4', userId: 'trader-4', displayName: 'DeFiYield', totalPnl: 89000, winRate: 75.8, totalTrades: 215, followers: 1230, riskScore: 4, isActive: true, createdAt: new Date(now - 5184000000).toISOString() },
];

const bankingMethods = [
  { id: 'swift', name: 'SWIFT International Wire', type: 'wire', currencies: ['USD', 'EUR', 'GBP'], fee: 25, minAmount: 100, maxAmount: 1000000, processingTime: '1-3 business days', countries: ['All'], isActive: true },
  { id: 'sepa', name: 'SEPA Transfer', type: 'wire', currencies: ['EUR'], fee: 2, minAmount: 10, maxAmount: 500000, processingTime: '1-2 business days', countries: ['EU', 'EEA'], isActive: true },
  { id: 'ach', name: 'ACH Direct Deposit', type: 'wire', currencies: ['USD'], fee: 0, minAmount: 1, maxAmount: 250000, processingTime: '3-5 business days', countries: ['US'], isActive: true },
  { id: 'gcc', name: 'GCC Bank Transfer', type: 'wire', currencies: ['AED', 'SAR'], fee: 0, minAmount: 50, maxAmount: 500000, processingTime: 'Same day', countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'], isActive: true },
];

const referrals = [
  { id: 'r-1', userId: 'user-1', referredEmail: 'user2@example.com', status: 'active', bonusEarned: 500, createdAt: new Date(now - 1209600000).toISOString() },
  { id: 'r-2', userId: 'user-1', referredEmail: 'user3@example.com', status: 'active', bonusEarned: 500, createdAt: new Date(now - 864000000).toISOString() },
  { id: 'r-3', userId: 'user-1', referredEmail: 'user4@example.com', status: 'pending', bonusEarned: 0, createdAt: new Date(now - 432000000).toISOString() },
];

const kycSubmissions = [
  { id: 'kyc-1', userId: 'user-1', status: 'verified', fullName: 'Demo User', documentType: 'passport', documentNumber: 'AB1234567', country: 'AE', submittedAt: new Date(now - 604800000).toISOString(), verifiedAt: new Date(now - 518400000).toISOString() },
];

const bankingTransactions = [
  { id: 'bt-1', userId: 'user-1', type: 'deposit', method: 'swift', currency: 'USD', amount: 100000, fee: 25, status: 'completed', reference: 'SWIFT-DEP-001', createdAt: new Date(now - 604800000).toISOString() },
  { id: 'bt-2', userId: 'user-1', type: 'withdraw', method: 'ach', currency: 'USD', amount: 25000, fee: 0, status: 'completed', reference: 'ACH-WD-002', createdAt: new Date(now - 432000000).toISOString() },
  { id: 'bt-3', userId: 'user-1', type: 'deposit', method: 'sepa', currency: 'EUR', amount: 50000, fee: 2, status: 'pending', reference: 'SEPA-DEP-003', createdAt: new Date(now - 86400000).toISOString() },
  { id: 'bt-4', userId: 'user-1', type: 'deposit', method: 'gcc', currency: 'AED', amount: 500000, fee: 0, status: 'completed', reference: 'GCC-DEP-004', createdAt: new Date(now - 172800000).toISOString() },
];

// Admin stats
const adminStats = {
  totalUsers: 28451,
  activeUsers: 12430,
  totalVolume24h: 3450000000,
  totalOrders: 892450,
  openOrders: 12350,
  totalDeposits: 875000000,
  totalWithdrawals: 623000000,
  revenue24h: 1250000,
  totalRevenue: 287500000,
  activeBots: 3450,
  openPositions: 2870,
  kycPending: 450,
  threatCount: 23,
  alertsTriggered: 128,
  averageResponseTime: 245,
  uptime: 99.97,
  serverLoad: 34,
  memoryUsage: 62,
};

function genOrderBook(sym) {
  const basePrice = markets.find(m => m.symbol === sym)?.price || 50000;
  const bids = [], asks = [];
  for (let i = 0; i < 15; i++) {
    const p = basePrice * (1 - (i + 1) * 0.001);
    bids.push({ price: +p.toFixed(2), amount: +(Math.random() * 10 + 0.1).toFixed(4) });
    const pa = basePrice * (1 + (i + 1) * 0.001);
    asks.push({ price: +pa.toFixed(2), amount: +(Math.random() * 10 + 0.1).toFixed(4) });
  }
  return { bids, asks };
}

function genCandles(sym, tf, limit) {
  const basePrice = markets.find(m => m.symbol === sym)?.price || 50000;
  const interval = tf === '1m' ? 60000 : tf === '5m' ? 300000 : tf === '15m' ? 900000 : tf === '1h' ? 3600000 : tf === '4h' ? 14400000 : tf === '1d' ? 86400000 : 3600000;
  const candles = [];
  for (let i = limit; i > 0; i--) {
    const t = now - i * interval;
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
    const close = open * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    candles.push({ time: t, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume: +(Math.random() * 1000 + 100).toFixed(2) });
  }
  return candles;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  try {
    // ── Auth Routes ───────────────────────────────────────────────
    if (path === '/api/auth/register' && method === 'POST') {
      const b = await body(req);
      if (users.find(u => u.email === b.email)) return json(res, 409, { error: 'Email already registered' });
      const user = { id: `user-${users.length + 1}`, email: b.email, fullName: b.fullName || 'User', password: b.password, kycStatus: 'pending', role: 'user', tier: 'bronze', referralCode: `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`, referralCount: 0, referralBonus: 0, createdAt: new Date().toISOString(), avatar: null, twoFactorEnabled: false, isActive: true };
      users.push(user);
      const at = signToken({ sub: user.id, email: user.email, role: user.role });
      const rt = randomBytes(32).toString('hex');
      sessions[rt] = { userId: user.id, createdAt: Date.now() };
      return json(res, 201, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, kycStatus: user.kycStatus, tier: user.tier }, accessToken: at, refreshToken: rt });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const b = await body(req);
      const user = users.find(u => u.email === b.email);
      if (!user || user.password !== b.password) return json(res, 401, { error: 'Invalid credentials' });
      const at = signToken({ sub: user.id, email: user.email, role: user.role });
      const rt = randomBytes(32).toString('hex');
      sessions[rt] = { userId: user.id, createdAt: Date.now() };
      return json(res, 200, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, kycStatus: user.kycStatus, tier: user.tier }, accessToken: at, refreshToken: rt });
    }

    if (path === '/api/auth/refresh' && method === 'POST') {
      const b = await body(req);
      const sess = sessions[b.refreshToken];
      if (!sess) return json(res, 401, { error: 'Invalid refresh token' });
      const user = users.find(u => u.id === sess.userId);
      if (!user) return json(res, 401, { error: 'User not found' });
      delete sessions[b.refreshToken];
      const at = signToken({ sub: user.id, email: user.email, role: user.role });
      const rt = randomBytes(32).toString('hex');
      sessions[rt] = { userId: user.id, createdAt: Date.now() };
      return json(res, 200, { accessToken: at, refreshToken: rt });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      return json(res, 200, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, kycStatus: user.kycStatus, tier: user.tier, referralCode: user.referralCode, referralCount: user.referralCount, referralBonus: user.referralBonus, createdAt: user.createdAt, avatar: user.avatar, twoFactorEnabled: user.twoFactorEnabled, isActive: user.isActive } });
    }

    if (path === '/api/auth/profile' && method === 'PUT') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      Object.assign(user, b);
      return json(res, 200, { user });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return json(res, 200, { success: true });
    }

    // ── Markets ──────────────────────────────────────────────────
    if (path === '/api/markets' && method === 'GET') {
      return json(res, 200, { markets });
    }

    const marketMatch = path.match(/^\/api\/markets\/(\w+\/\w+)$/);
    if (marketMatch && method === 'GET') {
      const sym = marketMatch[1].replace('%2F', '/').replace('%2f', '/');
      const m = markets.find(m => m.symbol === sym);
      if (!m) return json(res, 404, { error: 'Market not found' });
      return json(res, 200, { market: m });
    }

    const obMatch = path.match(/^\/api\/markets\/(\w+\/\w+)\/orderbook$/);
    if (obMatch && method === 'GET') {
      const sym = obMatch[1].replace('%2F', '/').replace('%2f', '/');
      return json(res, 200, { ...genOrderBook(sym), symbol: sym });
    }

    const candleMatch = path.match(/^\/api\/markets\/(\w+\/\w+)\/candles$/);
    if (candleMatch && method === 'GET') {
      const sym = candleMatch[1].replace('%2F', '/').replace('%2f', '/');
      const tf = url.searchParams.get('timeframe') || '1h';
      const limit = parseInt(url.searchParams.get('limit')) || 100;
      return json(res, 200, { candles: genCandles(sym, tf, limit) });
    }

    // ── Ticker ───────────────────────────────────────────────────
    if (path === '/api/ticker' && method === 'GET') {
      const tickers = {};
      markets.forEach(m => { tickers[m.symbol] = { symbol: m.symbol, price: m.price, change24h: m.change24h, high24h: m.high24h, low24h: m.low24h, volume24h: m.volume24h }; });
      return json(res, 200, { tickers });
    }

    // ── Orders ──────────────────────────────────────────────────
    if (path === '/api/orders' && method === 'GET') {
      const user = getUser(req);
      const userOrders = user ? orders.filter(o => o.userId === user.id) : [];
      return json(res, 200, { orders: userOrders });
    }

    if (path === '/api/orders' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      const order = { id: `ord-${Date.now()}`, userId: user.id, symbol: b.symbol, type: b.type || 'limit', side: b.side, price: b.price, amount: b.amount, filled: 0, status: 'open', createdAt: new Date().toISOString() };
      orders.unshift(order);
      return json(res, 201, { order });
    }

    const orderIdMatch = path.match(/^\/api\/orders\/(.+)$/);
    if (orderIdMatch && method === 'GET') {
      const order = orders.find(o => o.id === orderIdMatch[1]);
      if (!order) return json(res, 404, { error: 'Order not found' });
      return json(res, 200, { order });
    }

    if (orderIdMatch && method === 'DELETE') {
      const idx = orders.findIndex(o => o.id === orderIdMatch[1]);
      if (idx === -1) return json(res, 404, { error: 'Order not found' });
      orders[idx].status = 'cancelled';
      return json(res, 200, { order: orders[idx] });
    }

    // ── Trades ──────────────────────────────────────────────────
    if (path === '/api/trades' && method === 'GET') {
      const user = getUser(req);
      const userTrades = user ? trades.filter(t => t.userId === user.id) : [];
      return json(res, 200, { trades: userTrades });
    }

    // ── Wallets ──────────────────────────────────────────────────
    if (path === '/api/wallets' && method === 'GET') {
      const user = getUser(req);
      const userWallets = user ? wallets.filter(w => w.userId === user.id && !w.isFiat) : [];
      return json(res, 200, { wallets: userWallets });
    }

    if (path === '/api/wallets/bootstrap' && method === 'POST') {
      return json(res, 200, { wallets: wallets.filter(w => !w.isFiat) });
    }

    if (path === '/api/wallets/deposit' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      let w = wallets.find(w => w.userId === user.id && w.currency === b.currency);
      if (w) w.balance += b.amount;
      else { w = { id: `w-${Date.now()}`, userId: user.id, currency: b.currency, balance: b.amount, locked: 0, isFiat: false, address: null }; wallets.push(w); }
      return json(res, 200, { wallet: w });
    }

    // ── Fiat Wallets ────────────────────────────────────────────
    if (path === '/api/fiat-wallets' && method === 'GET') {
      const user = getUser(req);
      const userWallets = user ? wallets.filter(w => w.userId === user.id && w.isFiat) : [];
      return json(res, 200, { wallets: userWallets });
    }

    // ── Banking ──────────────────────────────────────────────────
    if (path === '/api/banking/methods' && method === 'GET') {
      return json(res, 200, { methods: bankingMethods });
    }

    if (path === '/api/banking/transactions' && method === 'GET') {
      const user = getUser(req);
      const txns = user ? bankingTransactions.filter(t => t.userId === user.id) : [];
      return json(res, 200, { transactions: txns });
    }

    if (path === '/api/banking/deposit' && method === 'POST') {
      const b = await body(req);
      const txn = { id: `bt-${Date.now()}`, userId: getUser(req)?.id, type: 'deposit', method: b.method || 'wire', currency: b.currency, amount: b.amount, fee: 0, status: 'pending', reference: `DEP-${Date.now()}`, createdAt: new Date().toISOString() };
      bankingTransactions.unshift(txn);
      return json(res, 200, { transaction: txn });
    }

    if (path === '/api/banking/withdraw' && method === 'POST') {
      const b = await body(req);
      const txn = { id: `bt-${Date.now()}`, userId: getUser(req)?.id, type: 'withdraw', method: b.method || 'wire', currency: b.currency, amount: b.amount, fee: 0, status: 'pending', reference: `WD-${Date.now()}`, createdAt: new Date().toISOString() };
      bankingTransactions.unshift(txn);
      return json(res, 200, { transaction: txn });
    }

    if (path === '/api/banking/transfer' && method === 'POST') {
      return json(res, 200, { success: true, reference: `TRF-${Date.now()}` });
    }

    if (path === '/api/banking/performance' && method === 'GET') {
      return json(res, 200, { totalDeposits: 875000000, totalWithdrawals: 623000000, monthlyVolume: 142000000, topCurrency: 'USD', successRate: 99.2, averageProcessingTime: '2.4 hours' });
    }

    // ── Futures ──────────────────────────────────────────────────
    if (path === '/api/futures/positions' && method === 'GET') {
      const user = getUser(req);
      const positions = user ? futuresPositions.filter(p => p.userId === user.id) : [];
      return json(res, 200, { positions });
    }

    if (path === '/api/futures/positions' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      const market = markets.find(m => m.symbol === b.symbol);
      if (!market) return json(res, 400, { error: 'Invalid symbol' });
      const pos = { id: `fp-${Date.now()}`, userId: user.id, symbol: b.symbol, side: b.side || 'long', size: +b.size, leverage: +b.leverage || 10, entryPrice: market.price, markPrice: market.price, liquidationPrice: market.price * (b.side === 'long' ? 0.9 : 1.1), pnl: 0, pnlPercent: 0, margin: (+b.size * market.price) / (+b.leverage || 10), status: 'open', createdAt: new Date().toISOString() };
      futuresPositions.unshift(pos);
      return json(res, 201, { position: pos });
    }

    const fpMatch = path.match(/^\/api\/futures\/positions\/(.+)\/close$/);
    if (fpMatch && method === 'PUT') {
      const pos = futuresPositions.find(p => p.id === fpMatch[1]);
      if (!pos) return json(res, 404, { error: 'Position not found' });
      pos.status = 'closed';
      return json(res, 200, { position: pos });
    }

    const fpGetMatch = path.match(/^\/api\/futures\/positions\/(.+)$/);
    if (fpGetMatch && method === 'GET') {
      const pos = futuresPositions.find(p => p.id === fpGetMatch[1]);
      if (!pos) return json(res, 404, { error: 'Position not found' });
      return json(res, 200, { position: pos });
    }

    if (path === '/api/futures/leverage' && method === 'POST') {
      return json(res, 200, { leverage: (await body(req)).leverage });
    }

    // ── Bots ─────────────────────────────────────────────────────
    if (path === '/api/bots' && method === 'GET') {
      const user = getUser(req);
      const bots = user ? tradingBots.filter(b => b.userId === user.id) : [];
      return json(res, 200, { bots });
    }

    if (path === '/api/bots' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      const bot = { id: `bot-${Date.now()}`, userId: user.id, name: b.name, strategy: b.strategy || 'grid', symbol: b.symbol, status: 'running', pnl24h: 0, totalPnl: 0, createdAt: new Date().toISOString() };
      tradingBots.unshift(bot);
      return json(res, 201, { bot });
    }

    const botMatch = path.match(/^\/api\/bots\/(.+)\/(start|stop)$/);
    if (botMatch && method === 'POST') {
      const bot = tradingBots.find(b => b.id === botMatch[1]);
      if (!bot) return json(res, 404, { error: 'Bot not found' });
      bot.status = botMatch[2] === 'start' ? 'running' : 'stopped';
      return json(res, 200, { bot });
    }

    const botIdMatch = path.match(/^\/api\/bots\/(.+)$/);
    if (botIdMatch && method === 'PUT') {
      const bot = tradingBots.find(b => b.id === botIdMatch[1]);
      if (!bot) return json(res, 404, { error: 'Bot not found' });
      const b = await body(req);
      Object.assign(bot, b);
      return json(res, 200, { bot });
    }

    if (botIdMatch && method === 'DELETE') {
      const idx = tradingBots.findIndex(b => b.id === botIdMatch[1]);
      if (idx === -1) return json(res, 404, { error: 'Bot not found' });
      tradingBots.splice(idx, 1);
      return json(res, 204);
    }

    // ── Copy Trading ─────────────────────────────────────────────
    if (path === '/api/copy-trading/traders' && method === 'GET') {
      return json(res, 200, { traders: copyTraders });
    }

    const ctMatch = path.match(/^\/api\/copy-trading\/traders\/(.+)$/);
    if (ctMatch && method === 'GET') {
      const t = copyTraders.find(c => c.id === ctMatch[1]);
      if (!t) return json(res, 404, { error: 'Trader not found' });
      return json(res, 200, { trader: t });
    }

    if (path === '/api/copy-trading/my-copies' && method === 'GET') {
      return json(res, 200, { copies: [] });
    }

    if (path === '/api/copy-trading/copy' && method === 'POST') {
      return json(res, 200, { copyTrade: { id: `copy-${Date.now()}`, status: 'active' } });
    }

    const copyStopMatch = path.match(/^\/api\/copy-trading\/copy\/(.+)\/stop$/);
    if (copyStopMatch && method === 'PUT') {
      return json(res, 200, { copyTrade: { id: copyStopMatch[1], status: 'stopped' } });
    }

    // ── Earn / Staking ───────────────────────────────────────────
    if (path === '/api/earn/products' && method === 'GET') {
      return json(res, 200, { products: stakingProducts });
    }

    if (path === '/api/earn/stake' && method === 'POST') {
      return json(res, 200, { position: { id: `stake-${Date.now()}`, status: 'active' } });
    }

    if (path === '/api/earn/positions' && method === 'GET') {
      return json(res, 200, { positions: [] });
    }

    if (path === '/api/earn/liquidity' && method === 'POST') {
      return json(res, 200, { session: { id: `liq-${Date.now()}`, status: 'active', shares: 1000 } });
    }

    const liqMatch = path.match(/^\/api\/earn\/liquidity\/(.+)\/withdraw$/);
    if (liqMatch && method === 'POST') {
      return json(res, 200, { session: { id: liqMatch[1], status: 'withdrawn' } });
    }

    // ── Price Alerts ─────────────────────────────────────────────
    if (path === '/api/price-alerts' && method === 'GET') {
      const user = getUser(req);
      const alerts = user ? priceAlerts.filter(a => a.userId === user.id) : [];
      return json(res, 200, { alerts });
    }

    if (path === '/api/price-alerts' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      const alert = { id: `pa-${Date.now()}`, userId: user.id, symbol: b.symbol, condition: b.condition || 'above', price: +b.price, triggered: false, active: true, createdAt: new Date().toISOString() };
      priceAlerts.unshift(alert);
      return json(res, 201, { alert });
    }

    const paToggleMatch = path.match(/^\/api\/price-alerts\/(.+)\/toggle$/);
    if (paToggleMatch && method === 'PUT') {
      const alert = priceAlerts.find(a => a.id === paToggleMatch[1]);
      if (!alert) return json(res, 404, { error: 'Alert not found' });
      alert.active = !alert.active;
      return json(res, 200, { alert });
    }

    const paDelMatch = path.match(/^\/api\/price-alerts\/(.+)$/);
    if (paDelMatch && method === 'DELETE') {
      const idx = priceAlerts.findIndex(a => a.id === paDelMatch[1]);
      if (idx === -1) return json(res, 404);
      priceAlerts.splice(idx, 1);
      return json(res, 204);
    }

    // ── KYC ──────────────────────────────────────────────────────
    if (path === '/api/kyc/status' && method === 'GET') {
      const user = getUser(req);
      const kyc = user ? kycSubmissions.find(k => k.userId === user.id) : null;
      return json(res, 200, { status: kyc?.status || 'not_submitted', submission: kyc });
    }

    if (path === '/api/kyc/submit' && method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'Unauthorized' });
      const b = await body(req);
      const submission = { id: `kyc-${Date.now()}`, userId: user.id, status: 'pending', fullName: b.fullName, ...b, submittedAt: new Date().toISOString() };
      kycSubmissions.unshift(submission);
      return json(res, 200, { submission });
    }

    // ── Notifications ────────────────────────────────────────────
    if (path === '/api/notifications' && method === 'GET') {
      const user = getUser(req);
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const notifs = user ? notifications.filter(n => n.userId === user.id).slice(0, limit) : [];
      return json(res, 200, { notifications: notifs });
    }

    if (path === '/api/notifications/read-all' && method === 'PUT') {
      notifications.forEach(n => n.read = true);
      return json(res, 200, { success: true });
    }

    const notifMatch = path.match(/^\/api\/notifications\/(.+)\/read$/);
    if (notifMatch && method === 'PUT') {
      const n = notifications.find(x => x.id === notifMatch[1]);
      if (n) n.read = true;
      return json(res, 200, { notification: n });
    }

    // ── Rewards ──────────────────────────────────────────────────
    if (path === '/api/rewards' && method === 'GET') {
      const user = getUser(req);
      return json(res, 200, { points: 12500, tier: 'platinum', referralBonus: user?.referralBonus || 0, referralCode: user?.referralCode, referrals: referrals.filter(r => r.userId === user?.id) });
    }

    // ── Admin ─────────────────────────────────────────────────────
    if (path === '/api/admin/stats' && method === 'GET') {
      const user = getUser(req);
      if (user?.role !== 'admin') return json(res, 200, adminStats);
      return json(res, 200, adminStats);
    }

    if (path === '/api/admin/users' && method === 'GET') {
      return json(res, 200, { users: users.map(u => { const { password, ...rest } = u; return rest; }) });
    }

    if (path === '/api/admin/threats' && method === 'GET') {
      return json(res, 200, { threats: [] });
    }

    if (path === '/api/admin/audit-logs' && method === 'GET') {
      return json(res, 200, { auditLogs: [] });
    }

    if (path === '/api/admin/scan' && method === 'POST') {
      return json(res, 200, { threatsFound: 0, scanDuration: 1.2 });
    }

    // ── Analytics ────────────────────────────────────────────────
    if (path === '/api/analytics/portfolio' && method === 'GET') {
      return json(res, 200, { totalBalance: 523450.75, totalPnl24h: 2890.50, totalPnlPercent24h: 0.55, allocation: { BTC: 45, ETH: 20, USDT: 15, SOL: 8, XRP: 5, Others: 7 } });
    }

    if (path === '/api/analytics/leaderboard' && method === 'GET') {
      return json(res, 200, { leaderboard: [
        { rank: 1, userId: 'user-whale', displayName: 'CryptoWhale', totalPnl: 1250000, winRate: 78.5 },
        { rank: 2, userId: 'user-trader', displayName: 'ScalpMaster', totalPnl: 890000, winRate: 82.3 },
        { rank: 3, userId: 'user-hodl', displayName: 'LongTermHodl', totalPnl: 450000, winRate: 71.2 },
      ]});
    }

    if (path === '/api/analytics/volume-history' && method === 'GET') {
      const days = parseInt(url.searchParams.get('days')) || 30;
      const history = [];
      for (let i = days; i > 0; i--) {
        history.push({ date: new Date(now - i * 86400000).toISOString().slice(0, 10), volume: Math.random() * 500000000 + 100000000 });
      }
      return json(res, 200, { history });
    }

    // ── Entities (legacy) ────────────────────────────────────────
    const entityMatch = path.match(/^\/api\/entities\/(\w+)(?:\/([^/]+))?(?:\/(filter))?$/);
    if (entityMatch && method === 'GET') {
      return json(res, 200, { data: [] });
    }

    if (entityMatch && method === 'POST') {
      return json(res, 200, { data: { id: `ent-${Date.now()}`, ...(await body(req)) } });
    }

    if (entityMatch && method === 'PUT') {
      return json(res, 200, { data: { id: entityMatch[2] } });
    }

    if (entityMatch && method === 'DELETE') {
      return json(res, 204);
    }

    // ── Health ───────────────────────────────────────────────────
    if (path === '/api/health' || path === '/api/healthz') {
      return json(res, 200, { status: 'ok', uptime: process.uptime(), mock: true });
    }

    // ── 404 ───────────────────────────────────────────────────────
    json(res, 404, { error: 'Not found', path });

  } catch (err) {
    console.error('Mock server error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 Mock API server running at http://localhost:${PORT}`);
  console.log(`  📝 Login with: demo@atheer.com / password123\n`);
});

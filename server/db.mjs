import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'atheer.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    seedIfEmpty(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      kyc_status TEXT DEFAULT 'none',
      role TEXT DEFAULT 'user',
      tier TEXT DEFAULT 'bronze',
      referral_code TEXT UNIQUE,
      referral_count INTEGER DEFAULT 0,
      referral_bonus REAL DEFAULT 0,
      total_volume_usd REAL DEFAULT 0,
      swaps_count INTEGER DEFAULT 0,
      ai_risk_score_avg REAL DEFAULT 0,
      two_factor_enabled INTEGER DEFAULT 0,
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      currency TEXT NOT NULL,
      balance REAL DEFAULT 0,
      locked REAL DEFAULT 0,
      address TEXT,
      iban TEXT,
      is_fiat INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      base TEXT NOT NULL,
      quote TEXT NOT NULL,
      price REAL DEFAULT 0,
      change_24h REAL DEFAULT 0,
      high_24h REAL DEFAULT 0,
      low_24h REAL DEFAULT 0,
      volume_24h REAL DEFAULT 0,
      market_cap REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL,
      amount REAL NOT NULL,
      filled REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      amount REAL NOT NULL,
      total REAL NOT NULL,
      fee REAL DEFAULT 0,
      pnl REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS futures_positions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      size REAL NOT NULL,
      leverage INTEGER DEFAULT 1,
      entry_price REAL NOT NULL,
      mark_price REAL,
      liquidation_price REAL,
      pnl REAL DEFAULT 0,
      pnl_percent REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trading_bots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      symbol TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      status TEXT DEFAULT 'stopped',
      pnl_24h REAL DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS copy_traders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      total_pnl REAL DEFAULT 0,
      win_rate REAL DEFAULT 0,
      total_trades INTEGER DEFAULT 0,
      followers INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS copy_copies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      trader_id TEXT NOT NULL REFERENCES copy_traders(id),
      allocation REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      target_price REAL NOT NULL,
      direction TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS banking_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fee REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS banking_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      method TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS earn_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      apr REAL NOT NULL,
      min_amount REAL DEFAULT 0,
      duration_days INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS earn_positions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      apr REAL NOT NULL,
      status TEXT DEFAULT 'active',
      started_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kyc_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      referred_email TEXT,
      bonus_earned REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      refresh_token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threat_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT,
      source_ip TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM markets').get();
  if (count.c > 0) return;

  const now = Date.now();

  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, kyc_status, role, tier, referral_code, referral_count, referral_bonus, total_volume_usd, swaps_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'user-1', 'demo@atheer.com', '$2a$10$placeholder', 'Demo User', 'verified', 'user', 'platinum', 'DEMO123', 15, 2500, 523450.75, 142, 1
  );

  const wallets = [
    ['w-btc', 'user-1', 'BTC', 1.5243, 0, 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', null, 0],
    ['w-eth', 'user-1', 'ETH', 25.678, 2, '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18', null, 0],
    ['w-usdt', 'user-1', 'USDT', 50000, 10000, null, null, 0],
    ['w-sol', 'user-1', 'SOL', 150, 0, null, null, 0],
    ['w-xrp', 'user-1', 'XRP', 5000, 0, null, null, 0],
    ['w-usd', 'user-1', 'USD', 250000, 0, null, 'AE070331234567890123456', 1],
    ['w-eur', 'user-1', 'EUR', 100000, 0, null, 'DE89370400440532013000', 1],
    ['w-gbp', 'user-1', 'GBP', 50000, 0, null, 'GB29NWBK60161331926819', 1],
    ['w-aed', 'user-1', 'AED', 500000, 0, null, 'AE070331234567890123456', 1],
    ['w-sar', 'user-1', 'SAR', 300000, 0, null, 'SA0380000000608010167519', 1],
  ];
  const insWallet = db.prepare('INSERT INTO wallets (id, user_id, currency, balance, locked, address, iban, is_fiat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  wallets.forEach(w => insWallet.run(...w));

  const markets = [
    ['BTC/USDT', 'BTC/USDT', 'BTC', 'USDT', 87432.50, 2.34, 88900, 85400, 28450000000, 1720000000000, 1],
    ['ETH/USDT', 'ETH/USDT', 'ETH', 'USDT', 3921.80, 1.87, 3980, 3850, 15800000000, 472000000000, 1],
    ['SOL/USDT', 'SOL/USDT', 'SOL', 'USDT', 187.45, 5.62, 192, 177.50, 4200000000, 84000000000, 1],
    ['XRP/USDT', 'XRP/USDT', 'XRP', 'USDT', 0.7215, -0.43, 0.735, 0.718, 2100000000, 39500000000, 1],
    ['ADA/USDT', 'ADA/USDT', 'ADA', 'USDT', 0.6721, 3.21, 0.690, 0.651, 980000000, 23800000000, 1],
    ['DOT/USDT', 'DOT/USDT', 'DOT', 'USDT', 8.94, -1.25, 9.15, 8.82, 520000000, 12400000000, 1],
    ['AVAX/USDT', 'AVAX/USDT', 'AVAX', 'USDT', 38.72, 4.15, 39.50, 37.20, 890000000, 14600000000, 1],
    ['LINK/USDT', 'LINK/USDT', 'LINK', 'USDT', 18.34, 0.85, 18.65, 18.10, 410000000, 10800000000, 1],
    ['MATIC/USDT', 'MATIC/USDT', 'MATIC', 'USDT', 0.8934, 2.78, 0.91, 0.869, 380000000, 8300000000, 1],
    ['UNI/USDT', 'UNI/USDT', 'UNI', 'USDT', 7.68, -0.52, 7.82, 7.55, 210000000, 4600000000, 1],
    ['ATOM/USDT', 'ATOM/USDT', 'ATOM', 'USDT', 11.23, 1.45, 11.45, 11.08, 190000000, 4400000000, 1],
    ['LTC/USDT', 'LTC/USDT', 'LTC', 'USDT', 84.56, 0.23, 85.20, 83.90, 340000000, 6300000000, 1],
  ];
  const insMarket = db.prepare('INSERT INTO markets (id, symbol, base, quote, price, change_24h, high_24h, low_24h, volume_24h, market_cap, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  markets.forEach(m => insMarket.run(...m));

  const insOrder = db.prepare('INSERT INTO orders (id, user_id, symbol, type, side, price, amount, filled, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insOrder.run('ord-1', 'user-1', 'BTC/USDT', 'limit', 'buy', 86000, 0.5, 0.5, 'filled', new Date(now - 86400000).toISOString());
  insOrder.run('ord-2', 'user-1', 'ETH/USDT', 'limit', 'sell', 4000, 5, 0, 'open', new Date(now - 43200000).toISOString());
  insOrder.run('ord-3', 'user-1', 'SOL/USDT', 'market', 'buy', 187.45, 10, 10, 'filled', new Date(now - 21600000).toISOString());

  const insTrade = db.prepare('INSERT INTO trades (id, user_id, symbol, side, price, amount, total, fee, pnl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insTrade.run('tr-1', 'user-1', 'BTC/USDT', 'buy', 86000, 0.5, 43000, 86, null, new Date(now - 86400000).toISOString());

  const insNotif = db.prepare('INSERT INTO notifications (id, user_id, type, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insNotif.run('n-1', 'user-1', 'trade_filled', 'Order Filled', 'BUY 0.5 BTC @ $86,000 filled successfully.', 0, new Date(now - 3600000).toISOString());
  insNotif.run('n-2', 'user-1', 'price_alert', 'BTC at $87,432', 'BTC/USDT hit +2.34% today.', 0, new Date(now - 7200000).toISOString());

  db.prepare('INSERT INTO futures_positions (id, user_id, symbol, side, size, leverage, entry_price, mark_price, liquidation_price, pnl, pnl_percent, margin, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'fp-1', 'user-1', 'BTC/USDT', 'long', 0.5, 10, 85000, 87432.50, 76500, 1216.25, 28.62, 4250, 'open', new Date(now - 172800000).toISOString()
  );

  db.prepare('INSERT INTO trading_bots (id, user_id, name, strategy, symbol, config, status, pnl_24h, total_pnl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'bot-1', 'user-1', 'BTC Grid Bot', 'grid', 'BTC/USDT', '{}', 'running', 325.50, 2450, new Date(now - 604800000).toISOString()
  );

  const insTrader = db.prepare('INSERT INTO copy_traders (id, user_id, display_name, total_pnl, win_rate, total_trades, followers, risk_score, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insTrader.run('ct-1', 'trader-1', 'CryptoWhale', 125000, 78.5, 342, 1520, 3, 1, new Date(now - 2592000000).toISOString());
  insTrader.run('ct-2', 'trader-2', 'ScalpMaster', 45000, 82.3, 891, 780, 5, 1, new Date(now - 2592000000).toISOString());

  db.prepare('INSERT INTO banking_methods (id, name, fee) VALUES (?, ?, ?)').run('swift', 'SWIFT', 25);
  db.prepare('INSERT INTO banking_methods (id, name, fee) VALUES (?, ?, ?)').run('sepa', 'SEPA', 2);
  db.prepare('INSERT INTO banking_methods (id, name, fee) VALUES (?, ?, ?)').run('ach', 'ACH', 0);

  db.prepare('INSERT INTO earn_products (id, name, type, apr, min_amount, duration_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ep-1', 'BTC Staking', 'staking', 3.5, 0.01, 0, 1);
  db.prepare('INSERT INTO earn_products (id, name, type, apr, min_amount, duration_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ep-2', 'ETH Staking', 'staking', 4.2, 0.1, 0, 1);
  db.prepare('INSERT INTO earn_products (id, name, type, apr, min_amount, duration_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ep-3', 'USDT 90-Day', 'staking', 8.5, 100, 90, 1);

  db.prepare('INSERT INTO threat_alerts (id, type, severity, title, description, source_ip, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    'ta-1', 'suspicious_login', 'high', 'Suspicious Login Attempt', 'Multiple failed login attempts detected from unknown IP.', '185.220.101.42', 0, new Date(now - 86400000).toISOString()
  );
  db.prepare('INSERT INTO threat_alerts (id, type, severity, title, description, source_ip, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    'ta-2', 'large_withdrawal', 'medium', 'Large Withdrawal', 'Withdrawal of 50,000 USDT requested from new device.', '10.0.0.45', 0, new Date(now - 43200000).toISOString()
  );
}

export function entityTable(name) {
  const map = {
    UserProfile: 'users',
    Wallet: 'wallets',
    SwapOrder: 'orders',
    TradingBot: 'trading_bots',
    CopyTrader: 'copy_traders',
    StakingPosition: 'earn_positions',
    LiquiditySession: 'earn_positions',
    FuturesPosition: 'futures_positions',
    ThreatAlert: 'threat_alerts',
    AuditLog: 'audit_logs',
    FiatWallet: 'wallets',
    BankTransaction: 'banking_transactions',
    Referral: 'referrals',
    PriceAlert: 'price_alerts',
  };
  return map[name] || null;
}

export function entityFilters(name, userId) {
  const map = {
    UserProfile: { id: userId },
    Wallet: { user_id: userId },
    FiatWallet: { user_id: userId, is_fiat: 1 },
    SwapOrder: { user_id: userId },
    TradingBot: { user_id: userId },
    FuturesPosition: { user_id: userId },
    StakingPosition: { user_id: userId },
    LiquiditySession: { user_id: userId },
    ThreatAlert: null,
    AuditLog: null,
    BankTransaction: { user_id: userId },
    Referral: { user_id: userId },
    PriceAlert: { user_id: userId },
  };
  return map[name] || null;
}

export function closeDb() {
  if (db) { db.close(); db = null; }
}

export async function runMigrations(db) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS p2p_advertisements (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL, currency TEXT NOT NULL, fiat TEXT NOT NULL,
      price REAL NOT NULL, min_amount REAL DEFAULT 10, max_amount REAL NOT NULL,
      total_available REAL NOT NULL, remaining REAL NOT NULL,
      payment_methods TEXT DEFAULT '[]', terms TEXT DEFAULT '',
      status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS p2p_orders (
      id TEXT PRIMARY KEY, trade_id TEXT UNIQUE NOT NULL, ad_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL, seller_id TEXT NOT NULL,
      currency TEXT NOT NULL, fiat TEXT NOT NULL,
      amount REAL NOT NULL, fiat_amount REAL NOT NULL, price REAL NOT NULL,
      payment_method TEXT, status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP, completed_at TIMESTAMP,
      expires_at TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS marketplace_strategies (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL, description TEXT DEFAULT '',
      type TEXT NOT NULL, code TEXT NOT NULL,
      price REAL DEFAULT 0, avg_monthly_return REAL DEFAULT 0,
      max_drawdown REAL DEFAULT 0, risk_level TEXT DEFAULT 'medium',
      tags TEXT DEFAULT '[]', version TEXT DEFAULT '1.0.0',
      copies INTEGER DEFAULT 0, rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0, status TEXT DEFAULT 'published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      strategy_id TEXT NOT NULL, purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS marketplace_reviews (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      strategy_id TEXT NOT NULL, rating INTEGER NOT NULL,
      comment TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS social_rooms (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT DEFAULT '',
      type TEXT DEFAULT 'trading', max_members INTEGER DEFAULT 100,
      is_private INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
      member_count INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS social_room_members (
      id TEXT PRIMARY KEY, room_id TEXT NOT NULL,
      user_id TEXT NOT NULL, role TEXT DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS social_messages (
      id TEXT PRIMARY KEY, room_id TEXT NOT NULL,
      user_id TEXT NOT NULL, content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      user_name TEXT, user_tier TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS trading_signals (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL,
      room_id TEXT, symbol TEXT NOT NULL,
      direction TEXT NOT NULL, entry REAL NOT NULL,
      target REAL, stoploss REAL,
      confidence INTEGER DEFAULT 75, analysis TEXT,
      status TEXT DEFAULT 'active', hits INTEGER DEFAULT 0,
      misses INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wallet_whitelist (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      address TEXT NOT NULL, label TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wallet_limits (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      daily_limit REAL DEFAULT 50000, tx_limit REAL DEFAULT 10000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cold_wallets (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      public_key TEXT NOT NULL, encrypted_private_key TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  for (const sql of migrations) {
    try { await db.raw(sql); } catch (e) { console.error('Migration error:', e.message); }
  }
}

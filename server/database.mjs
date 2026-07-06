import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (!db) {
    const usePg = process.env.DATABASE_URL || process.env.PG_HOST;
    if (usePg) {
      db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL || {
          host: process.env.PG_HOST || 'localhost',
          port: parseInt(process.env.PG_PORT || '5432'),
          database: process.env.PG_DB || 'atheer',
          user: process.env.PG_USER || 'atheer',
          password: process.env.PG_PASSWORD || 'atheer',
          ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
        },
        pool: { min: 2, max: 10 },
      });
    } else {
      db = knex({
        client: 'better-sqlite3',
        connection: { filename: path.join(__dirname, '..', 'atheer.db') },
        useNullAsDefault: true,
      });
    }
  }
  return db;
}

export async function initDb() {
  const d = getDb();
  const usePg = !!process.env.DATABASE_URL || !!process.env.PG_HOST;

  const exists = await d.schema.hasTable('users');
  if (exists) return;

  await d.schema.createTable('users', t => {
    t.text('id').primary();
    t.text('email').unique().notNullable();
    t.text('password_hash').notNullable();
    t.text('full_name').defaultTo('');
    t.text('kyc_status').defaultTo('none');
    t.text('role').defaultTo('user');
    t.text('tier').defaultTo('bronze');
    t.text('referral_code').unique();
    t.integer('referral_count').defaultTo(0);
    t.float('referral_bonus').defaultTo(0);
    t.float('total_volume_usd').defaultTo(0);
    t.integer('swaps_count').defaultTo(0);
    t.float('ai_risk_score_avg').defaultTo(0);
    t.integer('two_factor_enabled').defaultTo(0);
    t.text('avatar');
    t.integer('is_active').defaultTo(1);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
    t.timestamp('last_login_at', { useTz: true });
  });

  await d.schema.createTable('wallets', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('currency').notNullable();
    t.float('balance').defaultTo(0);
    t.float('locked').defaultTo(0);
    t.text('address');
    t.text('iban');
    t.integer('is_fiat').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('markets', t => {
    t.text('id').primary();
    t.text('symbol').unique().notNullable();
    t.text('base').notNullable();
    t.text('quote').notNullable();
    t.float('price').defaultTo(0);
    t.float('change_24h').defaultTo(0);
    t.float('high_24h').defaultTo(0);
    t.float('low_24h').defaultTo(0);
    t.float('volume_24h').defaultTo(0);
    t.float('market_cap').defaultTo(0);
    t.integer('is_active').defaultTo(1);
    t.text('source').defaultTo('binance');
    t.timestamp('updated_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('orders', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('symbol').notNullable();
    t.text('type').notNullable();
    t.text('side').notNullable();
    t.float('price');
    t.float('amount').notNullable();
    t.float('filled').defaultTo(0);
    t.text('status').defaultTo('open');
    t.text('reduce_only').defaultTo('false');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('trades', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('symbol').notNullable();
    t.text('side').notNullable();
    t.float('price').notNullable();
    t.float('amount').notNullable();
    t.float('total').notNullable();
    t.float('fee').defaultTo(0);
    t.float('pnl');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('futures_positions', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('symbol').notNullable();
    t.text('side').notNullable();
    t.float('size').notNullable();
    t.integer('leverage').defaultTo(1);
    t.float('entry_price').notNullable();
    t.float('mark_price');
    t.float('liquidation_price');
    t.float('pnl').defaultTo(0);
    t.float('pnl_percent').defaultTo(0);
    t.float('margin').defaultTo(0);
    t.text('status').defaultTo('open');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('trading_bots', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('name').notNullable();
    t.text('strategy').notNullable();
    t.text('symbol').notNullable();
    t.text('config').defaultTo('{}');
    t.text('status').defaultTo('stopped');
    t.float('pnl_24h').defaultTo(0);
    t.float('total_pnl').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('copy_traders', t => {
    t.text('id').primary();
    t.text('user_id').notNullable();
    t.text('display_name').notNullable();
    t.float('total_pnl').defaultTo(0);
    t.float('win_rate').defaultTo(0);
    t.integer('total_trades').defaultTo(0);
    t.integer('followers').defaultTo(0);
    t.integer('risk_score').defaultTo(1);
    t.integer('is_active').defaultTo(1);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('copy_copies', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('trader_id').notNullable().references('id').inTable('copy_traders');
    t.float('allocation').defaultTo(0);
    t.text('status').defaultTo('active');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('notifications', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('type').notNullable();
    t.text('title').notNullable();
    t.text('message').notNullable();
    t.integer('read').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('price_alerts', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('symbol').notNullable();
    t.float('target_price').notNullable();
    t.text('direction').notNullable();
    t.text('status').defaultTo('active');
    t.timestamp('triggered_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('banking_methods', t => {
    t.text('id').primary();
    t.text('name').notNullable();
    t.float('fee').defaultTo(0);
  });

  await d.schema.createTable('banking_transactions', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('method').notNullable();
    t.text('type').notNullable();
    t.float('amount').notNullable();
    t.text('currency').defaultTo('USD');
    t.text('status').defaultTo('pending');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('earn_products', t => {
    t.text('id').primary();
    t.text('name').notNullable();
    t.text('type').notNullable();
    t.float('apr').notNullable();
    t.float('min_amount').defaultTo(0);
    t.integer('duration_days').defaultTo(0);
    t.integer('is_active').defaultTo(1);
  });

  await d.schema.createTable('earn_positions', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('product_id').notNullable();
    t.text('type').notNullable();
    t.float('amount').notNullable();
    t.float('apr').notNullable();
    t.float('earned').defaultTo(0);
    t.text('status').defaultTo('active');
    t.timestamp('started_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('kyc_documents', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('type').notNullable();
    t.text('status').defaultTo('pending');
    t.timestamp('submitted_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('referrals', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('referred_email');
    t.float('bonus_earned').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('sessions', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('refresh_token').unique().notNullable();
    t.text('ip_address');
    t.text('user_agent');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
    t.timestamp('expires_at', { useTz: true });
  });

  await d.schema.createTable('threat_alerts', t => {
    t.text('id').primary();
    t.text('user_id').references('id').inTable('users');
    t.text('type').notNullable();
    t.text('severity').defaultTo('medium');
    t.text('title').notNullable();
    t.text('description');
    t.text('source_ip');
    t.integer('resolved').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('audit_logs', t => {
    t.text('id').primary();
    t.text('user_id').references('id').inTable('users');
    t.text('action').notNullable();
    t.text('entity_type');
    t.text('entity_id');
    t.text('details').defaultTo('{}');
    t.text('ip_address');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('api_keys', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('name').notNullable();
    t.text('key').unique().notNullable();
    t.text('secret').notNullable();
    t.text('permissions').defaultTo('read');
    t.integer('is_active').defaultTo(1);
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await d.schema.createTable('withdraw_requests', t => {
    t.text('id').primary();
    t.text('user_id').notNullable().references('id').inTable('users');
    t.text('currency').notNullable();
    t.float('amount').notNullable();
    t.text('address').notNullable();
    t.text('network').notNullable();
    t.text('status').defaultTo('pending');
    t.text('tx_hash');
    t.timestamp('created_at', { useTz: true }).defaultTo(d.fn.now());
  });

  await seedData(d);
}

async function seedData(d) {
  const count = await d('markets').count('* as c').first();
  if (count.c > 0) return;

  const now = new Date();

  await d('users').insert({
    id: 'user-1', email: 'demo@atheer.com', password_hash: '$2a$10$placeholder',
    full_name: 'Demo User', kyc_status: 'verified', role: 'user', tier: 'platinum',
    referral_code: 'DEMO123', referral_count: 15, referral_bonus: 2500,
    total_volume_usd: 523450.75, swaps_count: 142, is_active: 1,
    created_at: new Date(now.getTime() - 86400000 * 30),
  });

  const wallets = [
    { id: 'w-btc', user_id: 'user-1', currency: 'BTC', balance: 1.5243, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
    { id: 'w-eth', user_id: 'user-1', currency: 'ETH', balance: 25.678, locked: 2, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' },
    { id: 'w-usdt', user_id: 'user-1', currency: 'USDT', balance: 50000, locked: 10000 },
    { id: 'w-sol', user_id: 'user-1', currency: 'SOL', balance: 150 },
    { id: 'w-xrp', user_id: 'user-1', currency: 'XRP', balance: 5000 },
    { id: 'w-usd', user_id: 'user-1', currency: 'USD', balance: 250000, iban: 'AE070331234567890123456', is_fiat: 1 },
    { id: 'w-eur', user_id: 'user-1', currency: 'EUR', balance: 100000, iban: 'DE89370400440532013000', is_fiat: 1 },
    { id: 'w-gbp', user_id: 'user-1', currency: 'GBP', balance: 50000, iban: 'GB29NWBK60161331926819', is_fiat: 1 },
    { id: 'w-aed', user_id: 'user-1', currency: 'AED', balance: 500000, iban: 'AE070331234567890123456', is_fiat: 1 },
    { id: 'w-sar', user_id: 'user-1', currency: 'SAR', balance: 300000, iban: 'SA0380000000608010167519', is_fiat: 1 },
  ];
  for (const w of wallets) await d('wallets').insert(w);

  const markets = [
    ['BTC/USDT', 'BTC', 'USDT', 87432.50, 2.34, 88900, 85400, 28450000000, 1720000000000],
    ['ETH/USDT', 'ETH', 'USDT', 3921.80, 1.87, 3980, 3850, 15800000000, 472000000000],
    ['SOL/USDT', 'SOL', 'USDT', 187.45, 5.62, 192, 177.50, 4200000000, 84000000000],
    ['XRP/USDT', 'XRP', 'USDT', 0.7215, -0.43, 0.735, 0.718, 2100000000, 39500000000],
    ['ADA/USDT', 'ADA', 'USDT', 0.6721, 3.21, 0.690, 0.651, 980000000, 23800000000],
    ['DOT/USDT', 'DOT', 'USDT', 8.94, -1.25, 9.15, 8.82, 520000000, 12400000000],
    ['AVAX/USDT', 'AVAX', 'USDT', 38.72, 4.15, 39.50, 37.20, 890000000, 14600000000],
    ['LINK/USDT', 'LINK', 'USDT', 18.34, 0.85, 18.65, 18.10, 410000000, 10800000000],
    ['MATIC/USDT', 'MATIC', 'USDT', 0.8934, 2.78, 0.91, 0.869, 380000000, 8300000000],
    ['UNI/USDT', 'UNI', 'USDT', 7.68, -0.52, 7.82, 7.55, 210000000, 4600000000],
    ['ATOM/USDT', 'ATOM', 'USDT', 11.23, 1.45, 11.45, 11.08, 190000000, 4400000000],
    ['LTC/USDT', 'LTC', 'USDT', 84.56, 0.23, 85.20, 83.90, 340000000, 6300000000],
  ];
  for (const m of markets) {
    await d('markets').insert({
      id: m[0].toLowerCase().replace('/', '-'), symbol: m[0], base: m[1], quote: m[2],
      price: m[3], change_24h: m[4], high_24h: m[5], low_24h: m[6],
      volume_24h: m[7], market_cap: m[8], is_active: 1, source: 'binance',
      updated_at: now,
    });
  }

  await d('orders').insert([
    { id: 'ord-1', user_id: 'user-1', symbol: 'BTC/USDT', type: 'limit', side: 'buy', price: 86000, amount: 0.5, filled: 0.5, status: 'filled', created_at: new Date(now.getTime() - 86400000) },
    { id: 'ord-2', user_id: 'user-1', symbol: 'ETH/USDT', type: 'limit', side: 'sell', price: 4000, amount: 5, filled: 0, status: 'open', created_at: new Date(now.getTime() - 43200000) },
  ]);

  await d('trades').insert({
    id: 'tr-1', user_id: 'user-1', symbol: 'BTC/USDT', side: 'buy', price: 86000, amount: 0.5, total: 43000, fee: 86, created_at: new Date(now.getTime() - 86400000),
  });

  await d('notifications').insert([
    { id: 'n-1', user_id: 'user-1', type: 'trade_filled', title: 'Order Filled', message: 'BUY 0.5 BTC @ $86,000 filled successfully.', created_at: new Date(now.getTime() - 3600000) },
    { id: 'n-2', user_id: 'user-1', type: 'price_alert', title: 'BTC at $87,432', message: 'BTC/USDT hit +2.34% today.', created_at: new Date(now.getTime() - 7200000) },
  ]);

  await d('futures_positions').insert({
    id: 'fp-1', user_id: 'user-1', symbol: 'BTC/USDT', side: 'long', size: 0.5, leverage: 10,
    entry_price: 85000, mark_price: 87432.50, liquidation_price: 76500,
    pnl: 1216.25, pnl_percent: 28.62, margin: 4250, status: 'open',
    created_at: new Date(now.getTime() - 172800000),
  });

  await d('trading_bots').insert({
    id: 'bot-1', user_id: 'user-1', name: 'BTC Grid Bot', strategy: 'grid', symbol: 'BTC/USDT',
    config: '{}', status: 'running', pnl_24h: 325.50, total_pnl: 2450,
    created_at: new Date(now.getTime() - 604800000),
  });

  await d('copy_traders').insert([
    { id: 'ct-1', user_id: 'trader-1', display_name: 'CryptoWhale', total_pnl: 125000, win_rate: 78.5, total_trades: 342, followers: 1520, risk_score: 3, is_active: 1, created_at: new Date(now.getTime() - 2592000000) },
    { id: 'ct-2', user_id: 'trader-2', display_name: 'ScalpMaster', total_pnl: 45000, win_rate: 82.3, total_trades: 891, followers: 780, risk_score: 5, is_active: 1, created_at: new Date(now.getTime() - 2592000000) },
  ]);

  await d('banking_methods').insert([
    { id: 'swift', name: 'SWIFT', fee: 25 },
    { id: 'sepa', name: 'SEPA', fee: 2 },
    { id: 'ach', name: 'ACH', fee: 0 },
  ]);

  await d('earn_products').insert([
    { id: 'ep-1', name: 'BTC Staking', type: 'staking', apr: 3.5, min_amount: 0.01, duration_days: 0, is_active: 1 },
    { id: 'ep-2', name: 'ETH Staking', type: 'staking', apr: 4.2, min_amount: 0.1, duration_days: 0, is_active: 1 },
    { id: 'ep-3', name: 'USDT 90-Day', type: 'staking', apr: 8.5, min_amount: 100, duration_days: 90, is_active: 1 },
  ]);

  await d('threat_alerts').insert([
    { id: 'ta-1', type: 'suspicious_login', severity: 'high', title: 'Suspicious Login Attempt', description: 'Multiple failed login attempts detected from unknown IP.', source_ip: '185.220.101.42', created_at: new Date(now.getTime() - 86400000) },
    { id: 'ta-2', type: 'large_withdrawal', severity: 'medium', title: 'Large Withdrawal', description: 'Withdrawal of 50,000 USDT requested from new device.', source_ip: '10.0.0.45', created_at: new Date(now.getTime() - 43200000) },
  ]);
}

export function closeDb() {
  if (db) { db.destroy(); db = null; }
}

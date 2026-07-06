import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

async function seed() {
  console.log('Seeding database...');

  try {
    const adminPassword = await bcrypt.hash('Admin@123456', 14);

    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, kyc_status, kyc_level, status, referral_code)
      VALUES
        ('admin@atheer.io', $1, 'Admin User', 'superadmin', 'verified', 3, 'active', 'AT-ADMIN'),
        ('trader@atheer.io', $1, 'Test Trader', 'user', 'verified', 2, 'active', 'AT-TRADER'),
        ('user@atheer.io', $1, 'Regular User', 'user', 'none', 0, 'active', 'AT-USER')
      ON CONFLICT (email) DO NOTHING;
    `, [adminPassword]);

    const markets = [
      { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', price: 108500, change: 2.35, vol: 38500000000, cap: 2100000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', price: 3650, change: 1.82, vol: 18500000000, cap: 438000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT', price: 690, change: -0.45, vol: 3200000000, cap: 106000000000, maker: 0.00075, taker: 0.00075 },
      { symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', price: 165, change: 5.12, vol: 5800000000, cap: 72000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT', price: 2.25, change: -1.32, vol: 4200000000, cap: 125000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT', price: 0.78, change: 3.67, vol: 1800000000, cap: 28000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', price: 0.18, change: -2.15, vol: 2500000000, cap: 26000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', price: 36, change: 4.89, vol: 1200000000, cap: 14000000000, maker: 0.001, taker: 0.001 },
      { symbol: 'MATIC/USDT', base: 'MATIC', quote: 'USDT', price: 0.58, change: 1.25, vol: 850000000, cap: 5400000000, maker: 0.001, taker: 0.001 },
      { symbol: 'TRX/USDT', base: 'TRX', quote: 'USDT', price: 0.14, change: 0.85, vol: 620000000, cap: 12800000000, maker: 0.0005, taker: 0.0005 },
      { symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', price: 18, change: 2.45, vol: 950000000, cap: 10500000000, maker: 0.001, taker: 0.001 },
      { symbol: 'DOT/USDT', base: 'DOT', quote: 'USDT', price: 7.85, change: -0.65, vol: 520000000, cap: 10500000000, maker: 0.001, taker: 0.001 },
    ];

    for (const m of markets) {
      await pool.query(`
        INSERT INTO markets (symbol, base_asset, quote_asset, last_price, change_24h, high_24h, low_24h, volume_24h, market_cap, bid_price, ask_price, maker_fee, taker_fee, min_trade_size, price_precision, quantity_precision)
        VALUES ($1, $2, $3, $4, $5, $4 * (1 + ABS($5)/100), $4 * (1 - ABS($5)/200), $6, $7, $4 * 0.9995, $4 * 1.0005, $8, $9, 0.0001, CASE WHEN $4 >= 1 THEN 2 ELSE 6 END, 8)
        ON CONFLICT (symbol) DO UPDATE SET
          last_price = EXCLUDED.last_price,
          change_24h = EXCLUDED.change_24h,
          volume_24h = EXCLUDED.volume_24h;
      `, [m.symbol, m.base, m.quote, m.price, m.change, m.vol, m.cap, m.maker, m.taker]);
    }

    const pools = [
      { name: 'Stable Yield USDT', t0: 'USDT', t1: 'USDC', tvl: 25000000, apy: 12.5, vol: 8500000 },
      { name: 'ETH-BNB LP', t0: 'ETH', t1: 'BNB', tvl: 18500000, apy: 18.2, vol: 6200000 },
      { name: 'BTC-ETH LP', t0: 'BTC', t1: 'ETH', tvl: 42000000, apy: 8.5, vol: 15000000 },
      { name: 'SOL-USDT LP', t0: 'SOL', t1: 'USDT', tvl: 12000000, apy: 22.0, vol: 4800000 },
    ];

    for (const p of pools) {
      await pool.query(`
        INSERT INTO liquidity_pools (pool_name, token0, token1, tvl_usd, apy_percent, volume_24h)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;
      `, [p.name, p.t0, p.t1, p.tvl, p.apy, p.vol]);
    }

    console.log('Seed completed successfully');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

import ccxt from 'ccxt';
import { getDb } from './database.mjs';

let binance;
let lastFetch = 0;
const FETCH_INTERVAL = 10000;
let tickerCache = {};
let orderBookCache = {};

export async function initExchange() {
  try {
    binance = new ccxt.binance({ enableRateLimit: true, timeout: 10000 });
    await binance.loadMarkets();
    console.log('  ✓ Binance CCXT connected');
  } catch (e) {
    console.log('  ⚠ Binance CCXT unavailable, using cached data');
    binance = null;
  }
}

export async function getTickers() {
  const now = Date.now();
  if (now - lastFetch < FETCH_INTERVAL && Object.keys(tickerCache).length > 0) {
    return tickerCache;
  }

  const db = getDb();
  const markets = await db('markets').where('is_active', 1);

  if (binance) {
    try {
      const symbols = markets.map(m => m.symbol);
      const tickers = await binance.fetchTickers(symbols);
      for (const m of markets) {
        const t = tickers[m.symbol];
        if (t) {
          const price = t.last || m.price;
          tickerCache[m.symbol] = {
            symbol: m.symbol,
            price,
            change24h: t.percentage || m.change_24h,
            high24h: t.high || m.high_24h,
            low24h: t.low || m.low_24h,
            volume24h: t.quoteVolume || m.volume_24h,
            bid: t.bid || price,
            ask: t.ask || price,
            source: 'binance',
            updatedAt: now,
          };
          await db('markets').where('symbol', m.symbol).update({
            price, change_24h: t.percentage || m.change_24h,
            high_24h: t.high || m.high_24h, low_24h: t.low || m.low_24h,
            volume_24h: t.quoteVolume || m.volume_24h,
            updated_at: new Date(now),
          });
        }
      }
      lastFetch = now;
      return tickerCache;
    } catch (e) {
      console.error('CCXT fetch error:', e.message);
    }
  }

  for (const m of markets) {
    tickerCache[m.symbol] = {
      symbol: m.symbol, price: m.price, change24h: m.change_24h,
      high24h: m.high_24h, low24h: m.low_24h, volume24h: m.volume_24h,
      bid: m.price * 0.999, ask: m.price * 1.001,
      source: 'cache', updatedAt: now,
    };
  }
  return tickerCache;
}

export async function getOrderBook(symbol, limit = 10) {
  if (binance) {
    try {
      const ob = await binance.fetchOrderBook(symbol, limit);
      orderBookCache[symbol] = ob;
      return ob;
    } catch (e) {
      console.error('OrderBook fetch error:', e.message);
    }
  }

  if (orderBookCache[symbol]) return orderBookCache[symbol];

  const db = getDb();
  const market = await db('markets').where('symbol', symbol).first();
  const p = market ? market.price : 50000;
  const spread = p * 0.001;
  const bids = Array.from({ length: limit }, (_, i) => [p - spread * (i + 1), (Math.random() + 0.1).toFixed(4)]);
  const asks = Array.from({ length: limit }, (_, i) => [p + spread * (i + 1), (Math.random() + 0.1).toFixed(4)]);
  return { bids, asks, timestamp: Date.now() };
}

export async function getCandles(symbol, timeframe = '5m', limit = 100) {
  if (binance) {
    try {
      const tfMap = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
      const tf = tfMap[timeframe] || '5m';
      const ohlcv = await binance.fetchOHLCV(symbol, tf, undefined, limit);
      return ohlcv.map(c => ({
        time: Math.floor(c[0] / 1000),
        open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
      }));
    } catch (e) {
      console.error('Candles fetch error:', e.message);
    }
  }

  const db = getDb();
  const market = await db('markets').where('symbol', symbol).first();
  const base = market ? market.price : 50000;
  const tfSecs = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }[timeframe] || 300;
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  for (let i = limit - 1; i >= 0; i--) {
    const t = now - i * tfSecs;
    const o = base + (Math.random() - 0.5) * base * 0.02;
    const c = o + (Math.random() - 0.5) * o * 0.01;
    candles.push({ time: t, open: o, high: Math.max(o, c) * 1.002, low: Math.min(o, c) * 0.998, close: c, volume: Math.random() * 1000 });
  }
  return candles;
}

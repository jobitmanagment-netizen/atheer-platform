import { query } from '../db/pool.js';
import { env } from '../config/env.js';

type ExchangeName = 'binance' | 'coinbase' | 'kraken' | 'bybit' | 'okx';

interface TickerData {
  last?: number;
  percentage?: number;
  quoteVolume?: number;
  high?: number;
  low?: number;
  bid?: number;
  ask?: number;
}

interface ExchangeLike {
  loadMarkets(): Promise<any>;
  fetchTicker(symbol: string): Promise<TickerData>;
  fetchOHLCV(symbol: string, timeframe?: string, since?: number, limit?: number): Promise<any[]>;
  fetchOrderBook(symbol: string, limit?: number): Promise<any>;
}

class MarketDataService {
  private exchanges: Map<string, ExchangeLike> = new Map();
  private isRunning = false;
  private intervals: ReturnType<typeof setInterval>[] = [];

  async initialize() {
    const exchangeNames: ExchangeName[] = ['binance', 'coinbase', 'kraken', 'bybit'];

    for (const name of exchangeNames) {
      try {
        const ccxtMod: any = await import('ccxt');
        const ExchangeClass = ccxtMod[name.charAt(0).toUpperCase() + name.slice(1)];
        if (!ExchangeClass) continue;

        const exchange: ExchangeLike = new ExchangeClass({
          enableRateLimit: env.CCXT_ENABLE_RATE_LIMIT,
          apiKey: env.EXCHANGE_API_KEY || undefined,
          secret: env.EXCHANGE_SECRET || undefined,
        });
        await exchange.loadMarkets();
        this.exchanges.set(name, exchange);
        console.log(`Connected to ${name}`);
      } catch (err) {
        console.warn(`Failed to connect to ${name}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  async fetchTicker(symbol: string): Promise<TickerData | null> {
    for (const [, exchange] of this.exchanges) {
      try {
        return await exchange.fetchTicker(symbol);
      } catch {
        continue;
      }
    }
    return null;
  }

  async fetchOHLCV(symbol: string, timeframe = '1h', limit = 100): Promise<any[] | null> {
    for (const [, exchange] of this.exchanges) {
      try {
        return await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      } catch {
        continue;
      }
    }
    return null;
  }

  async updateMarketData() {
    const symbols = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT',
      'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT',
      'MATIC/USDT', 'TRX/USDT', 'LINK/USDT', 'DOT/USDT',
    ];

    for (const symbol of symbols) {
      try {
        const ticker = await this.fetchTicker(symbol);
        if (!ticker || !ticker.last) continue;

        const price = ticker.last;
        const change = ticker.percentage || 0;
        const volume = ticker.quoteVolume || 0;
        const high = ticker.high || price;
        const low = ticker.low || price;
        const bid = ticker.bid || price * 0.9995;
        const ask = ticker.ask || price * 1.0005;

        await query(
          `UPDATE markets
           SET last_price = $1, change_24h = $2, volume_24h = $3,
               high_24h = GREATEST(high_24h, $4), low_24h = CASE WHEN $5 < low_24h OR low_24h = 0 THEN $5 ELSE low_24h END,
               bid_price = $6, ask_price = $7, updated_at = NOW()
           WHERE symbol = $8`,
          [price, change, volume, high, low, bid, ask, symbol],
        );
      } catch {
        // Skip failed symbols
      }
    }
  }

  startSync(intervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervals.push(setInterval(() => this.updateMarketData(), intervalMs));
    console.log(`Market data sync started (every ${intervalMs}ms)`);
  }

  stopSync() {
    this.isRunning = false;
    for (const interval of this.intervals) clearInterval(interval);
    this.intervals = [];
    console.log('Market data sync stopped');
  }

  async getOrderBook(symbol: string, limit = 50) {
    for (const [, exchange] of this.exchanges) {
      try {
        return await exchange.fetchOrderBook(symbol, limit);
      } catch {
        continue;
      }
    }
    return null;
  }
}

export const marketDataService = new MarketDataService();

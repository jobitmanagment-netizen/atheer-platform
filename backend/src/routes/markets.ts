import type { FastifyInstance } from 'fastify';

export async function registerMarketRoutes(app: FastifyInstance) {
  app.get('/api/markets', {
    schema: { tags: ['Markets'] },
  }, async () => {
    const { query } = await import('../db/pool.js');
    const result = await query(
      `SELECT id, symbol, base_asset, quote_asset, last_price, change_24h,
              high_24h, low_24h, volume_24h, market_cap, bid_price, ask_price,
              maker_fee, taker_fee, min_trade_size, max_trade_size,
              price_precision, quantity_precision, type, enabled
       FROM markets
       WHERE enabled = TRUE
       ORDER BY volume_24h DESC`,
    );
    return { markets: result.rows };
  });

  app.get('/api/markets/:symbol', {
    schema: { tags: ['Markets'] },
  }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const { query } = await import('../db/pool.js');
    const result = await query('SELECT * FROM markets WHERE symbol = $1 AND enabled = TRUE LIMIT 1', [symbol.toUpperCase()]);
    if (!result.rowCount) {
      const { AppError } = await import('../lib/errors.js');
      throw new AppError('Market not found', 404, 'MARKET_NOT_FOUND');
    }
    return { market: result.rows[0] };
  });

  app.get('/api/markets/:symbol/orderbook', {
    schema: { tags: ['Markets'] },
  }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const { query } = await import('../db/pool.js');
    const bids = await query(
      `SELECT price, quantity, total, order_count
       FROM order_book WHERE symbol = $1 AND side = 'bid'
       ORDER BY price DESC LIMIT 50`,
      [symbol.toUpperCase()],
    );
    const asks = await query(
      `SELECT price, quantity, total, order_count
       FROM order_book WHERE symbol = $1 AND side = 'ask'
       ORDER BY price ASC LIMIT 50`,
      [symbol.toUpperCase()],
    );
    return {
      symbol: symbol.toUpperCase(),
      bids: bids.rows,
      asks: asks.rows,
      timestamp: Date.now(),
    };
  });

  app.get('/api/markets/:symbol/candles', {
    schema: { tags: ['Markets'] },
  }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const query_params = request.query as { timeframe?: string; limit?: string };
    const timeframe = query_params.timeframe || '1h';
    const limit = Math.min(Number(query_params.limit) || 100, 1000);
    const { query } = await import('../db/pool.js');
    const result = await query(
      `SELECT timestamp, open, high, low, close, volume
       FROM market_data
       WHERE symbol = $1 AND timeframe = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [symbol.toUpperCase(), timeframe, limit],
    );
    return {
      symbol: symbol.toUpperCase(),
      timeframe,
      candles: result.rows.reverse(),
    };
  });

  app.get('/api/ticker', {
    schema: { tags: ['Markets'] },
  }, async () => {
    const { query } = await import('../db/pool.js');
    const result = await query(
      `SELECT symbol, last_price as price, change_24h, volume_24h,
              high_24h, low_24h, bid_price, ask_price
       FROM markets WHERE enabled = TRUE
       ORDER BY volume_24h DESC`,
    );
    const tickers: Record<string, any> = {};
    for (const row of result.rows) {
      tickers[row.symbol] = {
        price: Number(row.price),
        change24h: Number(row.change_24h),
        volume24h: Number(row.volume_24h),
        high24h: Number(row.high_24h),
        low24h: Number(row.low_24h),
        bid: Number(row.bid_price),
        ask: Number(row.ask_price),
      };
    }
    return { tickers, timestamp: Date.now() };
  });
}

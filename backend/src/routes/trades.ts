import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const createOrderSchema = z.object({
  marketId: z.string().uuid(),
  side: z.enum(['buy', 'sell']),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit', 'oco', 'trailing_stop']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  leverage: z.number().int().min(1).max(125).default(1),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK', 'GTD']).default('GTC'),
  reduceOnly: z.boolean().default(false),
  postOnly: z.boolean().default(false),
  takeProfitPrice: z.number().positive().optional(),
  stopLossPrice: z.number().positive().optional(),
  clientOrderId: z.string().max(128).optional(),
});

export async function registerTradeRoutes(app: FastifyInstance) {
  app.post('/api/orders', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = createOrderSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const marketResult = await client.query(
        `SELECT id, symbol, base_asset, quote_asset, last_price, enabled, min_trade_size, max_trade_size,
                maker_fee, taker_fee, price_precision, quantity_precision
         FROM markets WHERE id = $1 LIMIT 1`,
        [payload.marketId],
      );

      if (!marketResult.rowCount) {
        throw new AppError('Market not found', 404, 'MARKET_NOT_FOUND');
      }

      const market = marketResult.rows[0];
      if (!market.enabled) {
        throw new AppError('Market is disabled', 400, 'MARKET_DISABLED');
      }

      if (payload.quantity < Number(market.min_trade_size)) {
        throw new AppError(`Minimum trade size is ${market.min_trade_size}`, 400, 'MIN_TRADE_SIZE');
      }

      if (payload.quantity > Number(market.max_trade_size)) {
        throw new AppError(`Maximum trade size is ${market.max_trade_size}`, 400, 'MAX_TRADE_SIZE');
      }

      if (payload.orderType !== 'market' && !payload.price) {
        throw new AppError('Price is required for limit/stop orders', 400, 'PRICE_REQUIRED');
      }

      const walletResult = await client.query(
        `SELECT id, balance, available_balance
         FROM wallets
         WHERE user_id = $1 AND currency = $2
         LIMIT 1`,
        [userId, market.quote_asset],
      );

      if (payload.side === 'buy') {
        const requiredAmount = payload.quantity * (payload.price || Number(market.last_price));
        if (!walletResult.rowCount || Number(walletResult.rows[0].available_balance) < requiredAmount) {
          throw new AppError(`Insufficient ${market.quote_asset} balance`, 400, 'INSUFFICIENT_BALANCE');
        }
      } else {
        const baseWallet = await client.query(
          `SELECT id, balance, available_balance
           FROM wallets WHERE user_id = $1 AND currency = $2 LIMIT 1`,
          [userId, market.base_asset],
        );
        if (!baseWallet.rowCount || Number(baseWallet.rows[0].available_balance) < payload.quantity) {
          throw new AppError(`Insufficient ${market.base_asset} balance`, 400, 'INSUFFICIENT_BALANCE');
        }
      }

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, market_id, symbol, side, order_type, quantity, price, stop_price,
                             time_in_force, reduce_only, post_only, leverage, take_profit_price,
                             stop_loss_price, client_order_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'open')
         RETURNING *`,
        [
          userId, payload.marketId, market.symbol, payload.side, payload.orderType,
          payload.quantity, payload.price || null, payload.stopPrice || null,
          payload.timeInForce, payload.reduceOnly, payload.postOnly,
          payload.leverage, payload.takeProfitPrice || null, payload.stopLossPrice || null,
          payload.clientOrderId || null,
        ],
      );

      const order = orderResult.rows[0];

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'CREATE_ORDER', 'Order', $2, $3)`,
        [userId, order.id, JSON.stringify({ symbol: order.symbol, side: order.side, quantity: order.quantity, price: order.price })],
      );

      return { order };
    });
  });

  app.get('/api/orders', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const queryParams = request.query as { status?: string; symbol?: string; limit?: string };
    const limit = Math.min(Number(queryParams.limit) || 50, 200);

    let sql = 'SELECT * FROM orders WHERE user_id = $1';
    const params: unknown[] = [userId];
    let idx = 2;

    if (queryParams.status) {
      sql += ` AND status = $${idx++}`;
      params.push(queryParams.status);
    }
    if (queryParams.symbol) {
      sql += ` AND symbol = $${idx++}`;
      params.push(queryParams.symbol.toUpperCase());
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + idx;
    params.push(limit);

    const result = await query(sql, params);
    return { orders: result.rows };
  });

  app.get('/api/orders/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2 LIMIT 1', [id, userId]);
    if (!result.rowCount) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    return { order: result.rows[0] };
  });

  app.delete('/api/orders/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `UPDATE orders SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status IN ('open', 'pending', 'partially_filled')
         RETURNING *`,
        [id, userId],
      );

      if (!result.rowCount) throw new AppError('Order not found or cannot be cancelled', 404, 'ORDER_NOT_FOUND');

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'CANCEL_ORDER', 'Order', $2, $3)`,
        [userId, id, JSON.stringify({ status: 'cancelled' })],
      );

      return { order: result.rows[0] };
    });
  });

  app.get('/api/trades', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const queryParams = request.query as { symbol?: string; limit?: string };
    const limit = Math.min(Number(queryParams.limit) || 50, 200);

    let sql = 'SELECT * FROM trade_history WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (queryParams.symbol) {
      sql += ' AND symbol = $2';
      params.push(queryParams.symbol.toUpperCase());
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return { trades: result.rows };
  });
}

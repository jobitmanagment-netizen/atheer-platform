import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const openPositionSchema = z.object({
  symbol: z.string(),
  side: z.enum(['long', 'short']),
  quantity: z.number().positive(),
  leverage: z.number().int().min(1).max(125),
  entryPrice: z.number().positive(),
  takeProfitPrice: z.number().positive().optional(),
  stopLossPrice: z.number().positive().optional(),
});

const updateLeverageSchema = z.object({
  symbol: z.string(),
  leverage: z.number().int().min(1).max(125),
});

export async function registerFuturesRoutes(app: FastifyInstance) {
  app.get('/api/futures/positions', {
    preHandler: app.requireAuth,
    schema: { tags: ['Futures'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      `SELECT * FROM futures_positions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return { positions: result.rows };
  });

  app.post('/api/futures/positions', {
    preHandler: app.requireAuth,
    schema: { tags: ['Futures'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = openPositionSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const margin = (payload.quantity * payload.entryPrice) / payload.leverage;
      const liquidationPrice = payload.side === 'long'
        ? payload.entryPrice * (1 - 1 / payload.leverage * 0.85)
        : payload.entryPrice * (1 + 1 / payload.leverage * 0.85);

      const result = await client.query(
        `INSERT INTO futures_positions (user_id, symbol, side, status, entry_price, mark_price,
                                         liquidation_price, quantity, leverage, margin, pnl_usd, roe_percent)
         VALUES ($1, $2, $3, 'open', $4, $4, $5, $6, $7, $8, 0, 0)
         RETURNING *`,
        [userId, payload.symbol.toUpperCase(), payload.side, payload.entryPrice,
         liquidationPrice, payload.quantity, payload.leverage, margin],
      );

      const position = result.rows[0];

      await client.query(
        `UPDATE users SET total_volume_usd = total_volume_usd + $1 WHERE id = $2`,
        [payload.quantity * payload.entryPrice, userId],
      );

      if (payload.takeProfitPrice) {
        await client.query(
          'UPDATE futures_positions SET take_profit_price = $1 WHERE id = $2',
          [payload.takeProfitPrice, position.id],
        );
      }
      if (payload.stopLossPrice) {
        await client.query(
          'UPDATE futures_positions SET stop_loss_price = $1 WHERE id = $2',
          [payload.stopLossPrice, position.id],
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'OPEN_FUTURES_POSITION', 'FuturesPosition', $2, $3, 'MEDIUM')`,
        [userId, position.id, JSON.stringify({ symbol: payload.symbol, side: payload.side, leverage: payload.leverage, margin })],
      );

      return { position };
    });
  });

  app.put('/api/futures/positions/:id/close', {
    preHandler: app.requireAuth,
    schema: { tags: ['Futures'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `UPDATE futures_positions SET status = 'closed', closed_at = NOW(),
          realized_pnl = unrealized_pnl, pnl_usd = unrealized_pnl
         WHERE id = $1 AND user_id = $2 AND status = 'open'
         RETURNING *`,
        [id, userId],
      );

      if (!result.rowCount) throw new AppError('Position not found or already closed', 404, 'POSITION_NOT_FOUND');

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'CLOSE_FUTURES_POSITION', 'FuturesPosition', $2, $3, 'LOW')`,
        [userId, id, JSON.stringify({ pnl: result.rows[0].pnl_usd })],
      );

      return { position: result.rows[0] };
    });
  });

  app.get('/api/futures/positions/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Futures'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query('SELECT * FROM futures_positions WHERE id = $1 AND user_id = $2 LIMIT 1', [id, userId]);
    if (!result.rowCount) throw new AppError('Position not found', 404, 'POSITION_NOT_FOUND');
    return { position: result.rows[0] };
  });

  app.post('/api/futures/leverage', {
    preHandler: app.requireAuth,
    schema: { tags: ['Futures'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = updateLeverageSchema.parse(request.body);

    await query(
      'UPDATE users SET leverage = $1 WHERE id = $2',
      [payload.leverage, userId],
    );

    return { leverage: payload.leverage };
  });
}

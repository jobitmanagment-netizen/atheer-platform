import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const startCopySchema = z.object({
  traderId: z.string().uuid(),
  allocationUsd: z.number().positive().max(1000000),
  copyPercent: z.number().min(1).max(100).default(100),
  maxCopyPerTrade: z.number().positive().optional(),
  stopLossPercent: z.number().min(0).max(100).optional(),
  takeProfitPercent: z.number().min(0).max(100).optional(),
});

export async function registerCopyTradingRoutes(app: FastifyInstance) {
  app.get('/api/copy-trading/traders', {
    schema: { tags: ['Copy Trading'] },
  }, async (request) => {
    const queryParams = request.query as { sort?: string; limit?: string };
    const limit = Math.min(Number(queryParams.limit) || 50, 100);
    const sortBy = queryParams.sort === 'followers' ? 'total_followers' : 'roi_30d';

    const result = await query(
      `SELECT * FROM traders WHERE is_active = TRUE ORDER BY ${sortBy} DESC LIMIT $1`,
      [limit],
    );
    return { traders: result.rows };
  });

  app.get('/api/copy-trading/traders/:id', {
    schema: { tags: ['Copy Trading'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await query('SELECT * FROM traders WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) throw new AppError('Trader not found', 404, 'TRADER_NOT_FOUND');
    return { trader: result.rows[0] };
  });

  app.get('/api/copy-trading/my-copies', {
    preHandler: app.requireAuth,
    schema: { tags: ['Copy Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      `SELECT ct.*, t.handle, t.roi_30d as trader_roi_30d, t.total_followers as trader_followers,
              t.win_rate as trader_win_rate
       FROM copy_trades ct
       JOIN traders t ON t.id = ct.trader_id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC`,
      [userId],
    );
    return { copies: result.rows };
  });

  app.post('/api/copy-trading/copy', {
    preHandler: app.requireAuth,
    schema: { tags: ['Copy Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = startCopySchema.parse(request.body);

    const trader = await query('SELECT * FROM traders WHERE id = $1 AND is_active = TRUE LIMIT 1', [payload.traderId]);
    if (!trader.rowCount) throw new AppError('Trader not found or inactive', 404, 'TRADER_NOT_FOUND');

    if (payload.allocationUsd < Number(trader.rows[0].min_copy_balance)) {
      throw new AppError(`Minimum copy balance is $${trader.rows[0].min_copy_balance}`, 400, 'MIN_BALANCE');
    }

    const existing = await query(
      'SELECT id FROM copy_trades WHERE user_id = $1 AND trader_id = $2 AND status = $3 LIMIT 1',
      [userId, payload.traderId, 'active'],
    );
    if (existing.rowCount) throw new AppError('Already copying this trader', 400, 'ALREADY_COPYING');

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO copy_trades (user_id, trader_id, allocation_usd, copy_percent, max_copy_per_trade,
                                   stop_loss_percent, take_profit_percent, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [userId, payload.traderId, payload.allocationUsd, payload.copyPercent,
         payload.maxCopyPerTrade || null, payload.stopLossPercent || null, payload.takeProfitPercent || null],
      );

      await client.query('UPDATE traders SET total_followers = total_followers + 1 WHERE id = $1', [payload.traderId]);

      return { copyTrade: result.rows[0] };
    });
  });

  app.put('/api/copy-trading/copy/:id/stop', {
    preHandler: app.requireAuth,
    schema: { tags: ['Copy Trading'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `UPDATE copy_trades SET status = 'stopped', stopped_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'active'
         RETURNING *`,
        [id, userId],
      );
      if (!result.rowCount) throw new AppError('Copy trade not found', 404, 'COPY_NOT_FOUND');

      await client.query(
        'UPDATE traders SET total_followers = GREATEST(0, total_followers - 1) WHERE id = $1',
        [result.rows[0].trader_id],
      );

      return { copyTrade: result.rows[0] };
    });
  });
}

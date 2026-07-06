import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const createBotSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  strategy: z.enum(['grid', 'dca', 'martingale', 'rebalance', 'arbitrage', 'custom']),
  pair: z.string(),
  allocatedBalance: z.number().positive(),
  config: z.any().default({}),
});

const updateBotConfigSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  config: z.any().optional(),
  allocatedBalance: z.number().positive().optional(),
});

export async function registerTradingBotRoutes(app: FastifyInstance) {
  app.get('/api/bots', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      'SELECT * FROM trading_bots WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return { bots: result.rows };
  });

  app.post('/api/bots', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = createBotSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO trading_bots (user_id, name, strategy, pair, allocated_balance, current_balance, config)
         VALUES ($1, $2, $3, $4, $5, $5, $6)
         RETURNING *`,
        [userId, payload.name, payload.strategy, payload.pair.toUpperCase(),
         payload.allocatedBalance, JSON.stringify(payload.config)],
      );

      return { bot: result.rows[0] };
    });
  });

  app.put('/api/bots/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const payload = updateBotConfigSchema.parse(request.body);

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (payload.name) { sets.push(`name = $${idx++}`); values.push(payload.name); }
    if (payload.config) { sets.push(`config = $${idx++}`); values.push(JSON.stringify(payload.config)); }
    if (payload.allocatedBalance) { sets.push(`allocated_balance = $${idx++}`); values.push(payload.allocatedBalance); }

    if (sets.length === 0) throw new AppError('No fields to update', 400, 'NO_UPDATES');

    sets.push('updated_at = NOW()');
    values.push(id, userId);

    const result = await query(
      `UPDATE trading_bots SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values,
    );

    if (!result.rowCount) throw new AppError('Bot not found', 404, 'BOT_NOT_FOUND');
    return { bot: result.rows[0] };
  });

  app.post('/api/bots/:id/start', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query(
      `UPDATE trading_bots SET status = 'running', last_run_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    if (!result.rowCount) throw new AppError('Bot not found', 404, 'BOT_NOT_FOUND');
    return { bot: result.rows[0] };
  });

  app.post('/api/bots/:id/stop', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query(
      "UPDATE trading_bots SET status = 'stopped' WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId],
    );
    if (!result.rowCount) throw new AppError('Bot not found', 404, 'BOT_NOT_FOUND');
    return { bot: result.rows[0] };
  });

  app.delete('/api/bots/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Trading Bots'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query('DELETE FROM trading_bots WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (!result.rowCount) throw new AppError('Bot not found', 404, 'BOT_NOT_FOUND');
    return { message: 'Bot deleted' };
  });
}

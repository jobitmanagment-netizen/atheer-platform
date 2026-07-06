import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const createAlertSchema = z.object({
  symbol: z.string(),
  targetPrice: z.number().positive(),
  direction: z.enum(['above', 'below']),
});

export async function registerPriceAlertRoutes(app: FastifyInstance) {
  app.get('/api/price-alerts', {
    preHandler: app.requireAuth,
    schema: { tags: ['Price Alerts'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      'SELECT * FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return { alerts: result.rows };
  });

  app.post('/api/price-alerts', {
    preHandler: app.requireAuth,
    schema: { tags: ['Price Alerts'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = createAlertSchema.parse(request.body);

    const activeCount = await query(
      'SELECT COUNT(*) FROM price_alerts WHERE user_id = $1 AND is_active = TRUE',
      [userId],
    );
    if (Number(activeCount.rows[0]?.count) >= 50) {
      throw new AppError('Maximum 50 active alerts allowed', 400, 'MAX_ALERTS');
    }

    const result = await query(
      `INSERT INTO price_alerts (user_id, symbol, target_price, direction, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [userId, payload.symbol.toUpperCase(), payload.targetPrice, payload.direction],
    );

    return { alert: result.rows[0] };
  });

  app.put('/api/price-alerts/:id/toggle', {
    preHandler: app.requireAuth,
    schema: { tags: ['Price Alerts'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query(
      'UPDATE price_alerts SET is_active = NOT is_active WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId],
    );
    if (!result.rowCount) throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    return { alert: result.rows[0] };
  });

  app.delete('/api/price-alerts/:id', {
    preHandler: app.requireAuth,
    schema: { tags: ['Price Alerts'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query('DELETE FROM price_alerts WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (!result.rowCount) throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    return { message: 'Alert deleted' };
  });
}

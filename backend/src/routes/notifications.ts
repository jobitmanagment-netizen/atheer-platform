import type { FastifyInstance } from 'fastify';
import { query } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export async function registerNotificationsRoutes(app: FastifyInstance) {
  app.get('/api/notifications', {
    preHandler: app.requireAuth,
    schema: { tags: ['Notifications'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const queryParams = request.query as { unreadOnly?: string; limit?: string };
    const limit = Math.min(Number(queryParams.limit) || 50, 200);

    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (queryParams.unreadOnly === 'true') {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId],
    );

    return {
      notifications: result.rows,
      unreadCount: Number(unreadCount.rows[0]?.count || 0),
    };
  });

  app.put('/api/notifications/:id/read', {
    preHandler: app.requireAuth,
    schema: { tags: ['Notifications'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId],
    );
    if (!result.rowCount) throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    return { notification: result.rows[0] };
  });

  app.put('/api/notifications/read-all', {
    preHandler: app.requireAuth,
    schema: { tags: ['Notifications'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
    return { message: 'All notifications marked as read' };
  });
}

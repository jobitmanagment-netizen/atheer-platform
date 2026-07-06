import type { FastifyInstance } from 'fastify';
import { query } from '../db/pool.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  app.get('/api/analytics/portfolio', {
    preHandler: app.requireAuth,
    schema: { tags: ['Analytics'] },
  }, async (request) => {
    const userId = request.authUser!.sub;

    const [wallets, orders, futures, bankTxs] = await Promise.all([
      query('SELECT currency, balance, available_balance, locked_balance FROM wallets WHERE user_id = $1', [userId]),
      query("SELECT COUNT(*) as total, COALESCE(SUM(filled_quantity * price), 0) as volume FROM trade_history WHERE user_id = $1", [userId]),
      query("SELECT COUNT(*) as open_positions, COALESCE(SUM(pnl_usd), 0) as total_pnl FROM futures_positions WHERE user_id = $1 AND status = 'open'", [userId]),
      query("SELECT COUNT(*) as bank_tx, COALESCE(SUM(amount), 0) as bank_volume FROM bank_transactions WHERE user_id = $1 AND status = 'completed'", [userId]),
    ]);

    return {
      wallets: wallets.rows,
      trading: orders.rows[0],
      futures: futures.rows[0],
      banking: bankTxs.rows[0],
    };
  });

  app.get('/api/analytics/leaderboard', {
    schema: { tags: ['Analytics'] },
  }, async () => {
    const result = await query(
      `SELECT id, full_name, total_volume_usd, swaps_count, ai_risk_score_avg
       FROM users
       WHERE total_volume_usd > 0
       ORDER BY total_volume_usd DESC
       LIMIT 50`,
    );
    return { leaderboard: result.rows };
  });

  app.get('/api/analytics/volume-history', {
    preHandler: app.requireAuth,
    schema: { tags: ['Analytics'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const days = Number((request.query as { days?: string }).days) || 30;

    const result = await query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as trade_count,
              COALESCE(SUM(quantity * price), 0) as volume
       FROM trade_history
       WHERE user_id = $1 AND created_at >= NOW() - $2::interval
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId, `${days} days`],
    );

    return { history: result.rows };
  });
}

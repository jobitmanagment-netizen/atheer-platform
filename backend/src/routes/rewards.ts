import type { FastifyInstance } from 'fastify';
import { query } from '../db/pool.js';

export async function registerRewardsRoutes(app: FastifyInstance) {
  app.get('/api/rewards', {
    preHandler: app.requireAuth,
    schema: { tags: ['Rewards'] },
  }, async (request) => {
    const userId = request.authUser!.sub;

    const rewardResult = await query(
      'SELECT * FROM rewards WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const referrals = await query(
      `SELECT r.*, u.full_name as referred_name
       FROM referrals r
       LEFT JOIN users u ON u.id = r.referred_user_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );

    const tiers = [
      { name: 'bronze', minPoints: 0, makerFee: 0.001, takerFee: 0.001, cashback: 0 },
      { name: 'silver', minPoints: 1000, makerFee: 0.0009, takerFee: 0.0009, cashback: 0.05 },
      { name: 'gold', minPoints: 5000, makerFee: 0.00075, takerFee: 0.00085, cashback: 0.1 },
      { name: 'platinum', minPoints: 25000, makerFee: 0.0005, takerFee: 0.00075, cashback: 0.15 },
      { name: 'diamond', minPoints: 100000, makerFee: 0.00025, takerFee: 0.0005, cashback: 0.2 },
    ];

    return {
      reward: rewardResult.rows[0] || { points: 0, tier: 'bronze', cashback_usd: 0, total_earned_usd: 0 },
      referrals: referrals.rows,
      tiers,
    };
  });
}

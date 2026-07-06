import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const stakeSchema = z.object({
  tokenSymbol: z.string(),
  productName: z.string(),
  amount: z.number().positive(),
  lockPeriodDays: z.number().int().min(0).max(365).default(30),
});

export async function registerStakingRoutes(app: FastifyInstance) {
  app.get('/api/earn/products', {
    schema: { tags: ['Earn'] },
  }, async () => {
    const staking = [
      { name: 'Flexible Savings', token: 'USDT', apy: 5.5, minAmount: 10, lockDays: 0, risk: 'low' },
      { name: '30-Day Lock', token: 'USDT', apy: 8.0, minAmount: 100, lockDays: 30, risk: 'low' },
      { name: '90-Day Lock', token: 'USDT', apy: 12.0, minAmount: 500, lockDays: 90, risk: 'low' },
      { name: '180-Day Lock', token: 'USDT', apy: 15.0, minAmount: 1000, lockDays: 180, risk: 'medium' },
      { name: 'ETH Staking', token: 'ETH', apy: 4.2, minAmount: 0.1, lockDays: 0, risk: 'low' },
      { name: 'SOL Staking', token: 'SOL', apy: 7.8, minAmount: 1, lockDays: 0, risk: 'low' },
    ];

    const pools = await query('SELECT * FROM liquidity_pools WHERE is_active = TRUE');

    return {
      stakingProducts: staking,
      liquidityPools: pools.rows,
    };
  });

  app.post('/api/earn/stake', {
    preHandler: app.requireAuth,
    schema: { tags: ['Earn'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = stakeSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const productRates: Record<string, number> = {
        'Flexible Savings': 5.5,
        '30-Day Lock': 8.0,
        '90-Day Lock': 12.0,
        '180-Day Lock': 15.0,
        'ETH Staking': 4.2,
        'SOL Staking': 7.8,
      };

      const apy = productRates[payload.productName] || 5.0;
      const unlockAt = payload.lockPeriodDays > 0
        ? `NOW() + INTERVAL '${payload.lockPeriodDays} days'`
        : null;

      const result = await client.query(
        `INSERT INTO staking_positions (user_id, token_symbol, product_name, status, amount, amount_usd,
                                         apy_percent, lock_period_days, unlock_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
         RETURNING *`,
        [userId, payload.tokenSymbol.toUpperCase(), payload.productName,
         payload.lockPeriodDays > 0 ? 'locked' : 'active', payload.amount, apy,
         payload.lockPeriodDays, unlockAt],
      );

      return { position: result.rows[0] };
    });
  });

  app.get('/api/earn/positions', {
    preHandler: app.requireAuth,
    schema: { tags: ['Earn'] },
  }, async (request) => {
    const userId = request.authUser!.sub;

    const [staking, liquidity] = await Promise.all([
      query('SELECT * FROM staking_positions WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      query('SELECT ls.*, lp.pool_name, lp.apy_percent as pool_apy FROM liquidity_sessions ls JOIN liquidity_pools lp ON lp.id = ls.pool_id WHERE ls.user_id = $1 ORDER BY ls.created_at DESC', [userId]),
    ]);

    return { staking: staking.rows, liquidity: liquidity.rows };
  });

  app.post('/api/earn/liquidity', {
    preHandler: app.requireAuth,
    schema: { tags: ['Earn'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { poolId: string; amountUsd: number };

    return withTransaction(userId, async (client) => {
      const pool = await client.query('SELECT * FROM liquidity_pools WHERE id = $1 AND is_active = TRUE LIMIT 1', [body.poolId]);
      if (!pool.rowCount) throw new AppError('Pool not found', 404, 'POOL_NOT_FOUND');

      const p = pool.rows[0];
      const ratio = body.amountUsd / Number(p.tvl_usd);
      const token0Amount = ratio * Number(p.tvl_usd) / 2 / (Math.random() * 100 + 1);
      const token1Amount = ratio * Number(p.tvl_usd) / 2 / (Math.random() * 100 + 1);

      const result = await client.query(
        `INSERT INTO liquidity_sessions (user_id, pool_id, amount_usd, token0_amount, token1_amount,
                                          apy_at_entry, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [userId, body.poolId, body.amountUsd, token0Amount, token1Amount, Number(p.apy_percent)],
      );

      await client.query(
        'UPDATE liquidity_pools SET tvl_usd = tvl_usd + $1 WHERE id = $2',
        [body.amountUsd, body.poolId],
      );

      return { session: result.rows[0] };
    });
  });

  app.post('/api/earn/liquidity/:id/withdraw', {
    preHandler: app.requireAuth,
    schema: { tags: ['Earn'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `UPDATE liquidity_sessions SET status = 'withdrawn', withdrawn_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'active'
         RETURNING *`,
        [id, userId],
      );
      if (!result.rowCount) throw new AppError('Liquidity session not found', 404, 'SESSION_NOT_FOUND');

      await client.query(
        'UPDATE liquidity_pools SET tvl_usd = GREATEST(0, tvl_usd - $1) WHERE id = $2',
        [result.rows[0].amount_usd, result.rows[0].pool_id],
      );

      return { session: result.rows[0] };
    });
  });
}

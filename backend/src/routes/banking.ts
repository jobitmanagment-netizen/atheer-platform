import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const transferMethods = ['wire', 'ach', 'sepa', 'swift', 'gcc', 'instant', 'card', 'internal'] as const;

const depositSchema = z.object({
  walletId: z.string().uuid(),
  currency: z.string().length(3),
  amount: z.number().positive(),
  method: z.enum(transferMethods),
  description: z.string().max(500).optional(),
});

const withdrawSchema = z.object({
  walletId: z.string().uuid(),
  currency: z.string().length(3),
  amount: z.number().positive(),
  method: z.enum(transferMethods),
  bankAccountId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export async function registerBankingRoutes(app: FastifyInstance) {
  app.get('/api/banking/transactions', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const queryParams = request.query as { status?: string; limit?: string };
    const limit = Math.min(Number(queryParams.limit) || 20, 100);

    let sql = 'SELECT * FROM bank_transactions WHERE user_id = $1';
    const params: unknown[] = [userId];
    if (queryParams.status) {
      sql += ' AND status = $2';
      params.push(queryParams.status);
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return { transactions: result.rows };
  });

  app.post('/api/banking/deposit', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = depositSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const walletResult = await client.query(
        'SELECT id FROM fiat_wallets WHERE id = $1 AND user_id = $2 LIMIT 1',
        [payload.walletId, userId],
      );
      if (!walletResult.rowCount) throw new AppError('Fiat wallet not found', 404, 'WALLET_NOT_FOUND');

      const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const fee = payload.method === 'instant' ? payload.amount * 0.015 :
                  payload.method === 'swift' ? Math.max(25, payload.amount * 0.001) :
                  payload.method === 'wire' ? Math.max(20, payload.amount * 0.001) :
                  payload.method === 'sepa' ? Math.max(1, payload.amount * 0.0005) :
                  payload.method === 'ach' ? Math.max(3, payload.amount * 0.0005) :
                  payload.method === 'gcc' ? Math.max(5, payload.amount * 0.0008) :
                  0;

      const result = await client.query(
        `INSERT INTO bank_transactions (user_id, wallet_id, type, method, currency, amount, fee, net_amount,
                                        reference_code, description, status)
         VALUES ($1, $2, 'deposit', $3, $4, $5, $6, $5 - $6, $7, $8, 'pending')
         RETURNING *`,
        [userId, payload.walletId, payload.method, payload.currency.toUpperCase(),
         payload.amount, Number(fee.toFixed(2)), reference, payload.description || null],
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'BANKING_DEPOSIT', 'BankTransaction', $2, $3, 'LOW')`,
        [userId, result.rows[0].id, JSON.stringify({ amount: payload.amount, currency: payload.currency, method: payload.method })],
      );

      return { transaction: result.rows[0] };
    });
  });

  app.post('/api/banking/withdraw', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = withdrawSchema.parse(request.body);

    return withTransaction(userId, async (client) => {
      const walletResult = await client.query(
        'SELECT id, balance, available_balance FROM fiat_wallets WHERE id = $1 AND user_id = $2 LIMIT 1',
        [payload.walletId, userId],
      );
      if (!walletResult.rowCount) throw new AppError('Fiat wallet not found', 404, 'WALLET_NOT_FOUND');

      const wallet = walletResult.rows[0];
      if (Number(wallet.available_balance) < payload.amount) {
        throw new AppError('Insufficient available balance', 400, 'INSUFFICIENT_BALANCE');
      }

      const fee = payload.method === 'instant' ? payload.amount * 0.015 :
                  payload.method === 'swift' ? Math.max(25, payload.amount * 0.001) :
                  payload.method === 'wire' ? Math.max(20, payload.amount * 0.001) : 0;

      await client.query(
        'UPDATE fiat_wallets SET available_balance = available_balance - $1, locked_balance = locked_balance + $1 WHERE id = $2',
        [payload.amount, payload.walletId],
      );

      const reference = `WTH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const result = await client.query(
        `INSERT INTO bank_transactions (user_id, wallet_id, type, method, currency, amount, fee, net_amount,
                                        reference_code, description, status)
         VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6, $5 - $6, $7, $8, 'processing')
         RETURNING *`,
        [userId, payload.walletId, payload.method, payload.currency.toUpperCase(),
         payload.amount, Number(fee.toFixed(2)), reference, payload.description || null],
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'BANKING_WITHDRAWAL', 'BankTransaction', $2, $3, 'MEDIUM')`,
        [userId, result.rows[0].id, JSON.stringify({ amount: payload.amount, currency: payload.currency, method: payload.method })],
      );

      return { transaction: result.rows[0] };
    });
  });

  app.post('/api/banking/transfer', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { fromCurrency: string; toCurrency: string; amount: number };

    return withTransaction(userId, async (client) => {
      const rates: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, AED: 0.27, SAR: 0.27 };
      const fromRate = rates[body.fromCurrency.toUpperCase()] || 1;
      const toRate = rates[body.toCurrency.toUpperCase()] || 1;
      const convertedAmount = Number(((body.amount * fromRate) / toRate).toFixed(2));

      await client.query(
        'UPDATE fiat_wallets SET balance = balance - $1, available_balance = available_balance - $1 WHERE user_id = $2 AND currency = $3',
        [body.amount, userId, body.fromCurrency.toUpperCase()],
      );

      await client.query(
        'UPDATE fiat_wallets SET balance = balance + $1, available_balance = available_balance + $1 WHERE user_id = $2 AND currency = $3',
        [convertedAmount, userId, body.toCurrency.toUpperCase()],
      );

      const reference = `FX-${Date.now().toString(36).toUpperCase()}`;
      const result = await client.query(
        `INSERT INTO bank_transactions (user_id, type, method, currency, amount, fee, net_amount,
                                        exchange_rate, target_currency, target_amount, reference_code, status)
         VALUES ($1, 'conversion', 'internal', $2, $3, 0, $3, $4, $5, $6, $7, 'completed')
         RETURNING *`,
        [userId, body.fromCurrency.toUpperCase(), body.amount,
         Number((toRate / fromRate).toFixed(6)), body.toCurrency.toUpperCase(), convertedAmount, reference],
      );

      return { transaction: result.rows[0], convertedAmount };
    });
  });

  app.get('/api/banking/methods', {
    schema: { tags: ['Banking'] },
  }, async () => {
    return {
      methods: [
        { id: 'SEPA', region: 'Europe', time: '1 day', fee: '$1 + 0.05%', color: '#627EEA', minAmount: 10, maxAmount: 50000 },
        { id: 'ACH', region: 'United States', time: '2 days', fee: '$3 + 0.05%', color: '#03A66D', minAmount: 1, maxAmount: 25000 },
        { id: 'GCC', region: 'Gulf Countries', time: '2 days', fee: '$5 + 0.08%', color: '#F0B90B', minAmount: 50, maxAmount: 100000 },
        { id: 'SWIFT', region: 'Global', time: '3-5 days', fee: '$25 + 0.1%', color: '#8247E5', minAmount: 100, maxAmount: 1000000 },
        { id: 'WIRE', region: 'US Domestic', time: '2-3 days', fee: '$20 + 0.1%', color: '#03A66D', minAmount: 10, maxAmount: 500000 },
        { id: 'INSTANT', region: 'Global', time: 'Instant', fee: '1.5%', color: '#CF304A', minAmount: 1, maxAmount: 10000 },
      ],
    };
  });

  app.get('/api/banking/performance', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const txs = await query(
      `SELECT currency, SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
              SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
              SUM(CASE WHEN type = 'conversion' THEN amount ELSE 0 END) as total_conversions,
              SUM(fee) as total_fees,
              COUNT(*) as tx_count
       FROM bank_transactions
       WHERE user_id = $1 AND status = 'completed'
       GROUP BY currency`,
      [userId],
    );

    const totals = await query(
      `SELECT COUNT(*) as total_tx,
              COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposited,
              COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawn,
              COALESCE(SUM(fee), 0) as total_fees_paid
       FROM bank_transactions
       WHERE user_id = $1 AND status = 'completed'`,
      [userId],
    );

    return {
      byCurrency: txs.rows,
      summary: totals.rows[0],
    };
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export async function registerWalletRoutes(app: FastifyInstance) {
  app.get('/api/wallets', {
    preHandler: app.requireAuth,
    schema: { tags: ['Wallets'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      `SELECT id, user_id, currency, label, balance, available_balance, locked_balance,
              address, chain, is_active, status, created_at, updated_at
       FROM wallets WHERE user_id = $1 ORDER BY currency ASC`,
      [userId],
    );
    return { wallets: result.rows };
  });

  app.post('/api/wallets/bootstrap', {
    preHandler: app.requireAuth,
    schema: { tags: ['Wallets'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { currencies?: string[] } || {};
    const currencies = body.currencies || ['USDT', 'BTC', 'ETH', 'BNB', 'SOL'];

    return withTransaction(userId, async (client) => {
      const created = [];
      for (const currency of currencies) {
        const result = await client.query(
          `INSERT INTO wallets (user_id, currency, label, balance, available_balance, locked_balance)
           VALUES ($1, $2, $3 || ' Wallet', 0, 0, 0)
           ON CONFLICT (user_id, currency) DO UPDATE SET updated_at = NOW()
           RETURNING id, user_id, currency, label, balance, available_balance, locked_balance, status, created_at, updated_at`,
          [userId, currency, currency],
        );
        created.push(result.rows[0]);
      }
      return { wallets: created };
    });
  });

  app.post('/api/wallets/deposit', {
    preHandler: app.requireAuth,
    schema: { tags: ['Wallets'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { currency: string; amount: number; chain?: string };
    if (!body.currency || !body.amount || body.amount <= 0) {
      throw new AppError('Invalid deposit request', 400, 'INVALID_REQUEST');
    }

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `UPDATE wallets SET balance = balance + $1, available_balance = available_balance + $1
         WHERE user_id = $2 AND currency = $3
         RETURNING *`,
        [body.amount, userId, body.currency.toUpperCase()],
      );

      if (!result.rowCount) {
        throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'DEPOSIT', 'Wallet', $2, $3, 'SAFE')`,
        [userId, body.currency, JSON.stringify({ currency: body.currency, amount: body.amount })],
      );

      return { wallet: result.rows[0] };
    });
  });

  // ── Fiat wallets ──

  app.get('/api/fiat-wallets', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query(
      `SELECT * FROM fiat_wallets WHERE user_id = $1 ORDER BY currency ASC`,
      [userId],
    );
    return { wallets: result.rows };
  });

  app.post('/api/fiat-wallets', {
    preHandler: app.requireAuth,
    schema: { tags: ['Banking'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { currency: string; label?: string };

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO fiat_wallets (user_id, currency, label, balance, available_balance, locked_balance)
         VALUES ($1, $2, $3, 0, 0, 0)
         ON CONFLICT (user_id, currency) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [userId, body.currency.toUpperCase(), body.label || `${body.currency} Wallet`],
      );
      return { wallet: result.rows[0] };
    });
  });
}

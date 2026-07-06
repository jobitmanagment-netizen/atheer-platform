import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

const registerSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120).trim(),
});

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function publicUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    status: row.status,
    kycStatus: row.kyc_status,
    kycLevel: row.kyc_level,
    mfaEnabled: row.mfa_enabled,
    totalVolumeUsd: Number(row.total_volume_usd),
    swapsCount: row.swaps_count,
    aiRiskScoreAvg: Number(row.ai_risk_score_avg),
    referralCode: row.referral_code,
    locale: row.locale,
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AT-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const payload = registerSchema.parse(request.body);

    const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
    if (existing.rowCount) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(payload.password, 14);
    const referralCode = generateReferralCode();

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, referral_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [payload.email, passwordHash, payload.fullName, referralCode],
    );

    const user = result.rows[0];

    const accessToken = await reply.jwtSign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: env.AUTH_TOKEN_TTL },
    );

    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: env.REFRESH_TOKEN_TTL },
    );

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshHash],
    );

    reply.status(201);
    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
    };
  });

  app.post('/api/auth/login', {
    schema: { tags: ['Auth'] },
  }, async (request, reply) => {
    const payload = loginSchema.parse(request.body);

    const result = await query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [payload.email],
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended' || user.status === 'disabled') {
      throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    const passwordOk = await bcrypt.compare(payload.password, user.password_hash);
    if (!passwordOk) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: env.AUTH_TOKEN_TTL },
    );

    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: env.REFRESH_TOKEN_TTL },
    );

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '30 days', $3, $4)`,
      [user.id, refreshHash, request.ip, request.headers['user-agent'] || ''],
    );

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return {
      user: publicUser(user),
      accessToken,
      refreshToken,
    };
  });

  app.post('/api/auth/refresh', {
    schema: { tags: ['Auth'] },
  }, async (request, reply) => {
    const payload = refreshSchema.parse(request.body);

    let decoded: { sub: string; type: string };
    try {
      decoded = await request.jwtVerify<{ sub: string; type: string }>({ onlyCookie: false });
    } catch {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    const tokenHash = await bcrypt.hash(payload.refreshToken, 10);
    const tokenResult = await query(
      `SELECT id FROM refresh_tokens
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [decoded.sub],
    );

    if (!tokenResult.rowCount) {
      throw new AppError('Refresh token expired or revoked', 401, 'INVALID_TOKEN');
    }

    const userResult = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [decoded.sub]);
    const user = userResult.rows[0];
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: env.AUTH_TOKEN_TTL },
    );

    return { accessToken };
  });

  app.get('/api/auth/me', {
    preHandler: app.requireAuth,
    schema: { tags: ['Auth'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    const user = result.rows[0];
    if (!user) {
      throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    }
    return { user: publicUser(user) };
  });

  app.put('/api/auth/profile', {
    preHandler: app.requireAuth,
    schema: { tags: ['Auth'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const body = request.body as { fullName?: string; displayName?: string; photoUrl?: string; locale?: string; timezone?: string };

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.fullName) { updates.push(`full_name = $${idx++}`); values.push(body.fullName); }
    if (body.displayName) { updates.push(`display_name = $${idx++}`); values.push(body.displayName); }
    if (body.photoUrl !== undefined) { updates.push(`photo_url = $${idx++}`); values.push(body.photoUrl); }
    if (body.locale) { updates.push(`locale = $${idx++}`); values.push(body.locale); }
    if (body.timezone) { updates.push(`timezone = $${idx++}`); values.push(body.timezone); }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_UPDATES');
    }

    values.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    return { user: publicUser(result.rows[0]) };
  });

  app.post('/api/auth/logout', {
    preHandler: app.requireAuth,
    schema: { tags: ['Auth'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    return { message: 'Logged out successfully' };
  });
}

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32).default('super-secret-key-min-32-chars-long!!'),
  JWT_REFRESH_SECRET: z.string().min(32).default('refresh-secret-key-min-32-chars-long!'),
  JWT_ISSUER: z.string().default('atheer'),
  JWT_AUDIENCE: z.string().default('atheer-web'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  AUTH_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  CCXT_ENABLE_RATE_LIMIT: z.coerce.boolean().default(true),
  EXCHANGE_API_KEY: z.string().default(''),
  EXCHANGE_SECRET: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
});

export const env = envSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

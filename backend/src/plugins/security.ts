import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import type { FastifyInstance } from 'fastify';
import { corsOrigins, env } from '../config/env.js';

export async function registerSecurityPlugins(app: FastifyInstance) {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === 'production' ? 120 : 500,
    timeWindow: '1 minute',
    ban: 5,
    keyGenerator: (request: any) => {
      return request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';
    },
    hook: 'onRequest',
  });

  await app.register(sensible, { errorHandler: false } as any);
}

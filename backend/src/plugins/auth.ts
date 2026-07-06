import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: {
      sub: string;
      email: string;
      role: string;
    };
  }

  interface FastifyInstance {
    requireAuth(request: FastifyRequest): Promise<void>;
  }
}

export async function registerAuthPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    } as any,
    verify: {
      allowedIss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    } as any,
  });

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { sub: string; email: string; role: string };
      if (!payload?.sub) {
        throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
      }
      request.authUser = payload;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
  });
}

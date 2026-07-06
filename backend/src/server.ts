import Fastify from 'fastify';
import { env, corsOrigins } from './config/env.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { healthCheck } from './db/pool.js';

import { registerAuthRoutes } from './routes/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMarketRoutes } from './routes/markets.js';
import { registerTradeRoutes } from './routes/trades.js';
import { registerWalletRoutes } from './routes/wallets.js';
import { registerBankingRoutes } from './routes/banking.js';
import { registerKycRoutes } from './routes/kyc.js';
import { registerFuturesRoutes } from './routes/futures.js';
import { registerTradingBotRoutes } from './routes/trading-bots.js';
import { registerCopyTradingRoutes } from './routes/copy-trading.js';
import { registerRewardsRoutes } from './routes/rewards.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerStakingRoutes } from './routes/staking.js';
import { registerPriceAlertRoutes } from './routes/price-alerts.js';
import { registerWebSocketRoutes } from './routes/websocket.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
  },
  trustProxy: true,
  bodyLimit: 1048576,
});

async function start() {
  await registerSecurityPlugins(app);

  try {
    const swagger = await import('@fastify/swagger');
    await app.register(swagger.default || swagger, {
      openapi: {
        info: {
          title: 'ATHEER Global Platform API',
          description: 'Enterprise-grade multi-chain Web3 liquidity & exchange platform',
          version: '2.0.0',
        },
        servers: [{ url: `http://localhost:${env.PORT}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    } as any);
  } catch { /* swagger optional */ }

  try {
    const swaggerUI = await import('@fastify/swagger-ui');
    await app.register(swaggerUI.default || swaggerUI, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    } as any);
  } catch { /* swagger UI optional */ }

  await registerAuthPlugin(app);

  // Health check - no auth
  await registerHealthRoutes(app);
  registerWebSocketRoutes(app);

  // All routes
  await registerAuthRoutes(app);
  await registerMarketRoutes(app);
  await registerTradeRoutes(app);
  await registerWalletRoutes(app);
  await registerBankingRoutes(app);
  await registerKycRoutes(app);
  await registerFuturesRoutes(app);
  await registerTradingBotRoutes(app);
  await registerCopyTradingRoutes(app);
  await registerRewardsRoutes(app);
  await registerNotificationsRoutes(app);
  await registerAdminRoutes(app);
  await registerAnalyticsRoutes(app);
  await registerStakingRoutes(app);
  await registerPriceAlertRoutes(app);

  app.setErrorHandler((error: any, request, reply) => {
    request.log.error({ err: error, path: request.url, method: request.method }, 'Request failed');

    const statusCode = error.statusCode || error.status || 500;
    const code = error.code || 'INTERNAL_ERROR';

    if (statusCode === 429) {
      return reply.status(429).send({
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        retryAfter: 60,
      });
    }

    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal server error' : error.message,
      code,
      requestId: request.id,
    });
  });

  app.get('/', async () => ({
    name: 'ATHEER Global Platform API',
    version: '2.0.0',
    status: 'secure',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health', async () => {
    const db = await healthCheck();
    return {
      status: db ? 'healthy' : 'degraded',
      database: db ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  console.log(`Server running on ${env.HOST}:${env.PORT}`);
  console.log(`API docs at http://localhost:${env.PORT}/docs`);
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

export default app;

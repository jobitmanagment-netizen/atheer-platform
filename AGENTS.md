# AGENTS.md — ATHEER Global Platform

## Build & Run
```bash
npm run build          # Build frontend (Vite)
npm run start          # Production server (Fastify + SQLite/PostgreSQL)
npm run start:dev      # Legacy server (Express + SQLite)
npm run dev            # Vite dev mode only
```

## Architecture

### Frontend (Vite + React 18)
- `src/` — All source files
- `src/api/ccsClient.js` — API client with proxy, entity CRUD, auth
- `src/lib/i18n.js` — Translation system (en/ar)
- `src/lib/logger.js` — Logging utility
- `src/context/AuthContext.jsx` — Auth state management

### Backend (Fastify)
- `server/index.mjs` — **Production server** with all endpoints
- `server/database.mjs` — PostgreSQL/SQLite dual database (Knex)
- `server/exchange.mjs` — CCXT integration (Binance live prices)
- `server/websocket.mjs` — WebSocket server (real-time tickers)
- `server/matching.mjs` — Order matching engine
- `production-server.mjs` — Legacy Express server (for reference)

### Deployment
```bash
# Production server:
node server/index.mjs
# Environment variables:
#   PG_HOST/PG_PORT/PG_DB/PG_USER/PG_PASSWORD — PostgreSQL (optional, SQLite used otherwise)
#   REDIS_HOST/REDIS_PORT — Redis (optional)
#   JWT_SECRET — JWT signing key
#   PORT — Server port (default 5173)
#   CCXT_ENABLED — Set to 'false' to disable live Binance data

# Docker:
docker compose up -d
```

## API Endpoints
- `/api/auth/*` — Login, register, refresh, profile, sessions, passwords
- `/api/markets` — Market data, orderbooks, candles
- `/api/ticker` — Live tickers (from Binance via CCXT)
- `/api/orders` — Order CRUD + matching engine
- `/api/trades` — Trade history
- `/api/wallets` — Crypto wallets, deposits, withdrawals
- `/api/fiat-wallets` — Fiat currency wallets
- `/api/banking/*` — Banking methods, transactions, transfers
- `/api/futures/*` — Futures positions + leverage
- `/api/bots/*` — Trading bots CRUD + start/stop
- `/api/copy-trading/*` — Copy trading traders + copies
- `/api/earn/*` — Staking products + liquidity
- `/api/price-alerts/*` — Price alert CRUD
- `/api/ai-models` — AI models listing
- `/api/liquidity/pools` — Liquidity pools
- `/api/rewards` — User rewards/points
- `/api/notifications/*` — Notifications CRUD
- `/api/analytics/*` — Portfolio, leaderboard, volume history
- `/api/admin/*` — Admin stats, users, threats, audit logs
- `/api/entities/:name` — Generic entity proxy (CRUD)
- `/api/api-keys/*` — API key management
- `/api/functions/invoke` — Serverless function invocation
- `/api/health`, `/api/healthz`, `/api/ping` — Health checks
- `/ws` — WebSocket (tickers, order updates, trades)

## Database
- **Development**: SQLite (`atheer.db`) — auto-created with seed data
- **Production**: PostgreSQL 16+ (set PG_* env vars)
- Demo login: `demo@atheer.com` / `password123`

## Troubleshooting
- If login fails: check DB file, run `Remove-Item atheer.db` to reset
- If CCXT fails: run with `CCXT_ENABLED=false` to use cached prices
- Port 5173 in use: set `PORT=3000`

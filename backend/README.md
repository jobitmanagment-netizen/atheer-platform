# ATHEER Global Platform Backend v2.0

Enterprise-grade Fastify + PostgreSQL backend for the ATHEER multi-chain Web3 liquidity & exchange platform.

## Architecture

```
Fastify Server (port 8080)
├── REST API (27 route modules)
├── WebSocket (real-time prices)
├── CCXT (market data from Binance, Coinbase, Kraken, Bybit)
└── PostgreSQL (20+ tables with Row-Level Security)
```

## Prerequisites

- **Node.js 20+**
- **PostgreSQL 16+** — [Download](https://www.postgresql.org/download/)
- **Redis** (optional, for caching) — [Download](https://redis.io/download)

## Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE atheer;"

# 3. Run migrations
npm run db:migrate

# 4. Seed sample data
npm run db:seed

# 5. Start development server
npm run dev
```

Server starts on `http://localhost:8080`
API docs at `http://localhost:8080/docs`

## Database Schema (20 tables)

| Module | Tables |
|--------|--------|
| Auth | `users`, `refresh_tokens`, `user_sessions`, `user_devices` |
| KYC | `kyc_submissions` |
| Wallets | `wallets` (crypto), `fiat_wallets`, `bank_accounts` |
| Banking | `bank_transactions` |
| Markets | `markets`, `market_data`, `order_book` |
| Trading | `orders`, `trade_history` |
| Futures | `futures_positions` |
| Bots | `trading_bots` |
| Copy Trading | `traders`, `copy_trades` |
| Earn | `staking_positions`, `liquidity_pools`, `liquidity_sessions` |
| Alerts | `price_alerts` |
| Rewards | `rewards`, `referrals` |
| Notifications | `notifications` |
| Admin | `audit_logs`, `threat_alerts` |

## API Routes

### Public
- `GET /api/health` — Health check
- `GET /api/ping` — Ping
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `GET /api/markets` — All markets
- `GET /api/markets/:symbol` — Single market
- `GET /api/markets/:symbol/orderbook` — Order book
- `GET /api/markets/:symbol/candles` — OHLCV data
- `GET /api/ticker` — All tickers
- `GET /api/banking/methods` — Transfer methods
- `GET /api/copy-trading/traders` — Trader leaderboard
- `GET /api/earn/products` — Staking & liquidity products
- `GET /api/analytics/leaderboard` — User leaderboard
- `WS /ws` — WebSocket for real-time prices

### Authenticated
- `GET /api/auth/me` — Current user profile
- `PUT /api/auth/profile` — Update profile
- `POST /api/auth/logout` — Logout
- `GET /api/wallets` — Crypto wallets
- `POST /api/wallets/bootstrap` — Create default wallets
- `POST /api/wallets/deposit` — Deposit to wallet
- `GET /api/fiat-wallets` — Fiat wallets
- `POST /api/fiat-wallets` — Create fiat wallet
- `GET/POST /api/orders` — List/create orders
- `GET/DELETE /api/orders/:id` — Get/cancel order
- `GET /api/trades` — Trade history
- `GET/POST /api/banking/transactions` — Bank transactions
- `POST /api/banking/deposit` — Deposit fiat
- `POST /api/banking/withdraw` — Withdraw fiat
- `POST /api/banking/transfer` — Currency conversion
- `GET /api/banking/performance` — Banking performance
- `POST /api/kyc/submit` — Submit KYC
- `GET /api/kyc/status` — KYC status
- `GET/POST /api/futures/positions` — Futures positions
- `PUT /api/futures/positions/:id/close` — Close position
- `POST /api/futures/leverage` — Set leverage
- `GET/POST /api/bots` — Trading bots CRUD
- `POST /api/bots/:id/start|stop` — Bot control
- `GET/POST /api/copy-trading/copy` — Copy trading
- `GET /api/copy-trading/my-copies` — My copy trades
- `GET/POST /api/earn/stake` — Staking
- `POST /api/earn/liquidity` — Add liquidity
- `GET/POST /api/price-alerts` — Price alerts
- `GET /api/rewards` — Rewards & referrals
- `GET /api/notifications` — Notifications
- `GET /api/analytics/portfolio` — Portfolio analytics

### Admin (requires admin role)
- `GET /api/admin/stats` — Platform stats
- `GET /api/admin/users` — All users
- `PUT /api/admin/users/:id` — Update user
- `GET /api/admin/threats` — Threat alerts
- `PUT /api/admin/threats/:id/resolve` — Resolve threat
- `GET /api/admin/audit-logs` — Audit log
- `POST /api/admin/scan` — Run security scan

## Services

### Market Data (`src/services/market-data.ts`)
- Connects to Binance, Coinbase, Kraken, Bybit via CCXT
- Syncs real-time prices every 5 seconds
- Stores OHLCV candles in `market_data` table
- Falls back gracefully if any exchange is down

### Risk Engine (`src/services/risk-engine.ts`)
- Evaluates transaction risk based on amount, user history, KYC level, velocity
- Returns score (0-100) and level (SAFE/LOW/MEDIUM/HIGH/CRITICAL)
- Calculates liquidation prices for futures positions
- Auto-generates threat alerts for suspicious activity

## Security

- **JWT** access tokens (15min TTL) + refresh tokens (30 day TTL)
- **bcrypt** password hashing (14 rounds)
- **Row-Level Security** on all user data tables
- **Helmet** security headers
- **Rate limiting** (120 req/min per IP, more restrictive in production)
- **CORS** with strict origin validation
- **Request logging** with Pino structured logging
- **Input validation** with Zod on all endpoints

## Frontend Integration

The Vite frontend proxies `/api` requests to the backend. Update `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Start both:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

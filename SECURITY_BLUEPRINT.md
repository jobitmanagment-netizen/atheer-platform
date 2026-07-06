# Security Blueprint

This platform is being moved to a proprietary architecture so it can scale beyond a vendor-backed SDK and remain fully controlled by its owner.

## Core principles
- Zero-trust by default.
- Least privilege everywhere.
- Every state-changing action is authenticated, authorized, rate-limited, and audited.
- Sensitive data is never trusted from the browser.
- Public data and private data are separated by design.

## Backend baseline
- Fastify for the HTTP layer.
- PostgreSQL as the system of record.
- JWT access tokens with short TTLs.
- Refresh tokens stored hashed and revocable.
- PostgreSQL RLS for account-level isolation.
- Redis for cache, sessions, throttling, and queues.
- WebSocket only for events that truly need it.

## Controls to add next
- MFA for every privileged account.
- Device binding for administrative sessions.
- Immutable audit logs for auth, trades, wallet movements, and admin actions.
- Risk checks before order placement and money movement.
- Secret rotation and environment separation for dev, staging, and production.
- Idempotency keys for payment and trading operations.

## Migration sequence
1. Auth and user profile.
2. Wallets and balances.
3. Markets and live data.
4. Trades and order management.
5. Banking and fiat rails.
6. Security, alerts, and compliance reporting.

## Ownership outcome
Once the frontend talks to the owned backend, the platform becomes fully proprietary and can evolve without vendor lock-in.

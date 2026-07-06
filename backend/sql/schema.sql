-- ATHEER Global Platform - Complete Database Schema
-- PostgreSQL 16+ required

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════
-- USERS & AUTH
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'support', 'compliance')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled', 'pending_kyc')),
  kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')),
  kyc_level INTEGER NOT NULL DEFAULT 0 CHECK (kyc_level >= 0 AND kyc_level <= 3),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret TEXT,
  mfa_backup_codes TEXT[] DEFAULT '{}',
  total_volume_usd NUMERIC(24, 2) NOT NULL DEFAULT 0,
  swaps_count INTEGER NOT NULL DEFAULT 0,
  ai_risk_score_avg NUMERIC(5, 2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- ══════════════════════════════════════════════════════════════
-- KYC / COMPLIANCE
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  document_type TEXT CHECK (document_type IN ('passport', 'national_id', 'drivers_license')),
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  proof_of_address_url TEXT,
  aml_risk_score NUMERIC(5, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'under_review', 'verified', 'rejected', 'appealed')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON kyc_submissions(user_id);
CREATE INDEX idx_kyc_status ON kyc_submissions(status);

-- ══════════════════════════════════════════════════════════════
-- WALLETS & BALANCES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  available_balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  address TEXT NOT NULL DEFAULT '',
  chain TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);

CREATE TABLE IF NOT EXISTS fiat_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  balance NUMERIC(16, 2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(16, 2) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(16, 2) NOT NULL DEFAULT 0,
  iban TEXT,
  account_number TEXT,
  routing_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

CREATE INDEX idx_fiat_wallets_user_id ON fiat_wallets(user_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  routing_number TEXT,
  swift_code TEXT,
  iban TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  country TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);

-- ══════════════════════════════════════════════════════════════
-- BANKING / FIAT TRANSACTIONS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES fiat_wallets(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'conversion')),
  method TEXT NOT NULL CHECK (method IN ('wire', 'ach', 'sepa', 'swift', 'gcc', 'instant', 'card', 'internal')),
  currency TEXT NOT NULL,
  amount NUMERIC(16, 2) NOT NULL,
  fee NUMERIC(16, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(16, 2) NOT NULL,
  exchange_rate NUMERIC(12, 6),
  target_currency TEXT,
  target_amount NUMERIC(16, 2),
  reference_code TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'under_review', 'flagged')),
  failure_reason TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_tx_user_id ON bank_transactions(user_id);
CREATE INDEX idx_bank_tx_status ON bank_transactions(status);
CREATE INDEX idx_bank_tx_created_at ON bank_transactions(created_at DESC);
CREATE INDEX idx_bank_tx_reference ON bank_transactions(reference_code);

-- ══════════════════════════════════════════════════════════════
-- MARKETS & TRADING
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  last_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  change_24h NUMERIC(12, 6) NOT NULL DEFAULT 0,
  high_24h NUMERIC(24, 8) NOT NULL DEFAULT 0,
  low_24h NUMERIC(24, 8) NOT NULL DEFAULT 0,
  volume_24h NUMERIC(24, 2) NOT NULL DEFAULT 0,
  market_cap NUMERIC(24, 2) NOT NULL DEFAULT 0,
  bid_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  ask_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  maker_fee NUMERIC(5, 4) NOT NULL DEFAULT 0.001,
  taker_fee NUMERIC(5, 4) NOT NULL DEFAULT 0.001,
  min_trade_size NUMERIC(24, 8) NOT NULL DEFAULT 0.0001,
  max_trade_size NUMERIC(24, 8) NOT NULL DEFAULT 1000,
  price_precision INTEGER NOT NULL DEFAULT 2,
  quantity_precision INTEGER NOT NULL DEFAULT 8,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  type TEXT NOT NULL DEFAULT 'spot' CHECK (type IN ('spot', 'margin', 'futures', 'perpetual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_markets_symbol ON markets(symbol);
CREATE INDEX idx_markets_enabled ON markets(enabled);
CREATE INDEX idx_markets_type ON markets(type);

CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open NUMERIC(24, 8) NOT NULL,
  high NUMERIC(24, 8) NOT NULL,
  low NUMERIC(24, 8) NOT NULL,
  close NUMERIC(24, 8) NOT NULL,
  volume NUMERIC(24, 2) NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'))
);

CREATE INDEX idx_market_data_symbol_timeframe ON market_data(symbol, timeframe);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);

CREATE TABLE IF NOT EXISTS order_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('bid', 'ask')),
  price NUMERIC(24, 8) NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL,
  total NUMERIC(24, 8) NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_book_symbol_side ON order_book(symbol, side);

-- ══════════════════════════════════════════════════════════════
-- ORDERS & TRADES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'oco', 'trailing_stop')),
  quantity NUMERIC(24, 8) NOT NULL,
  filled_quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  price NUMERIC(24, 8),
  stop_price NUMERIC(24, 8),
  trailing_stop_distance NUMERIC(24, 8),
  time_in_force TEXT NOT NULL DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired')),
  reduce_only BOOLEAN NOT NULL DEFAULT FALSE,
  post_only BOOLEAN NOT NULL DEFAULT FALSE,
  client_order_id TEXT,
  leverage INTEGER NOT NULL DEFAULT 1 CHECK (leverage >= 1 AND leverage <= 125),
  take_profit_price NUMERIC(24, 8),
  stop_loss_price NUMERIC(24, 8),
  metadata JSONB NOT NULL DEFAULT '{}',
  rejected_reason TEXT,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_market_id ON orders(market_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_symbol_status ON orders(symbol, status);

CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(24, 8) NOT NULL,
  price NUMERIC(24, 8) NOT NULL,
  total NUMERIC(24, 8) NOT NULL,
  fee NUMERIC(24, 8) NOT NULL DEFAULT 0,
  fee_currency TEXT NOT NULL DEFAULT 'USDT',
  fee_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  maker BOOLEAN NOT NULL DEFAULT FALSE,
  taker_order_id UUID,
  maker_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX idx_trade_history_order_id ON trade_history(order_id);
CREATE INDEX idx_trade_history_created_at ON trade_history(created_at DESC);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);

-- ══════════════════════════════════════════════════════════════
-- FUTURES / DERIVATIVES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS futures_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  entry_price NUMERIC(24, 8) NOT NULL,
  mark_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  liquidation_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  quantity NUMERIC(24, 8) NOT NULL,
  leverage INTEGER NOT NULL CHECK (leverage >= 1 AND leverage <= 125),
  margin NUMERIC(24, 8) NOT NULL,
  unrealized_pnl NUMERIC(24, 8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(24, 8) NOT NULL DEFAULT 0,
  pnl_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  roe_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  take_profit_price NUMERIC(24, 8),
  stop_loss_price NUMERIC(24, 8),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_futures_user_id ON futures_positions(user_id);
CREATE INDEX idx_futures_symbol ON futures_positions(symbol);
CREATE INDEX idx_futures_status ON futures_positions(status);

-- ══════════════════════════════════════════════════════════════
-- TRADING BOTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trading_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('grid', 'dca', 'martingale', 'rebalance', 'arbitrage', 'custom')),
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'paused', 'error')),
  pair TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  allocated_balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  current_balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  roi_30d NUMERIC(8, 2) NOT NULL DEFAULT 0,
  roi_total NUMERIC(8, 2) NOT NULL DEFAULT 0,
  profit_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_bots_user_id ON trading_bots(user_id);
CREATE INDEX idx_trading_bots_status ON trading_bots(status);

-- ══════════════════════════════════════════════════════════════
-- COPY TRADING
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  bio TEXT,
  roi_30d NUMERIC(8, 2) NOT NULL DEFAULT 0,
  roi_90d NUMERIC(8, 2) NOT NULL DEFAULT 0,
  total_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_followers INTEGER NOT NULL DEFAULT 0,
  total_copied_volume NUMERIC(24, 2) NOT NULL DEFAULT 0,
  win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  risk_score NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  min_copy_balance NUMERIC(16, 2) NOT NULL DEFAULT 100,
  performance_fee_percent NUMERIC(4, 2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_traders_roi ON traders(roi_30d DESC);
CREATE INDEX idx_traders_followers ON traders(total_followers DESC);

CREATE TABLE IF NOT EXISTS copy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
  allocation_usd NUMERIC(16, 2) NOT NULL,
  copy_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
  max_copy_per_trade NUMERIC(16, 2) DEFAULT 1000,
  stop_loss_percent NUMERIC(5, 2),
  take_profit_percent NUMERIC(5, 2),
  pnl_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  pnl_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  copied_trades INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, trader_id)
);

CREATE INDEX idx_copy_trades_user_id ON copy_trades(user_id);
CREATE INDEX idx_copy_trades_trader_id ON copy_trades(trader_id);

-- ══════════════════════════════════════════════════════════════
-- EARN / STAKING / LIQUIDITY
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_symbol TEXT NOT NULL,
  product_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'unstaking', 'completed', 'early_unstaked')),
  amount NUMERIC(24, 8) NOT NULL,
  amount_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  apy_percent NUMERIC(8, 4) NOT NULL,
  lock_period_days INTEGER NOT NULL DEFAULT 0,
  total_rewards NUMERIC(24, 8) NOT NULL DEFAULT 0,
  claimable_rewards NUMERIC(24, 8) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staking_user_id ON staking_positions(user_id);

CREATE TABLE IF NOT EXISTS liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_name TEXT NOT NULL,
  token0 TEXT NOT NULL,
  token1 TEXT NOT NULL,
  tvl_usd NUMERIC(24, 2) NOT NULL DEFAULT 0,
  apy_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
  volume_24h NUMERIC(24, 2) NOT NULL DEFAULT 0,
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liquidity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
  amount_usd NUMERIC(16, 2) NOT NULL,
  token0_amount NUMERIC(24, 8) NOT NULL,
  token1_amount NUMERIC(24, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  earnings_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  apy_at_entry NUMERIC(8, 4) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liquidity_sessions_user_id ON liquidity_sessions(user_id);

-- ══════════════════════════════════════════════════════════════
-- PRICE ALERTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  target_price NUMERIC(24, 8) NOT NULL,
  current_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  is_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);

-- ══════════════════════════════════════════════════════════════
-- REWARDS & REFERRALS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  cashback_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_earned_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_tier ON rewards(tier);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  reward_usd NUMERIC(16, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trade', 'deposit', 'withdrawal', 'alert', 'system', 'marketing', 'security', 'price_alert', 'referral')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOGS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);

-- ══════════════════════════════════════════════════════════════
-- THREAT ALERTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS threat_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title TEXT NOT NULL,
  message TEXT,
  address TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threat_alerts_user_id ON threat_alerts(user_id);
CREATE INDEX idx_threat_alerts_status ON threat_alerts(status);
CREATE INDEX idx_threat_alerts_severity ON threat_alerts(severity);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiat_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_wallets ON wallets
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_fiat_wallets ON fiat_wallets
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_orders ON orders
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_trades ON trade_history
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_futures ON futures_positions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_bots ON trading_bots
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_copy_trades ON copy_trades
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_staking ON staking_positions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_liquidity ON liquidity_sessions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_alerts ON price_alerts
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_bank_tx ON bank_transactions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_bank_accounts ON bank_accounts
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_kyc ON kyc_submissions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_notifications ON notifications
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_rewards ON rewards
  FOR ALL USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_isolation_referrals ON referrals
  FOR ALL USING (referrer_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (referrer_id = current_setting('app.user_id', true)::uuid);

-- ══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tables_with_updated_at TEXT[] := ARRAY['users', 'wallets', 'fiat_wallets', 'orders', 'markets', 'futures_positions', 'trading_bots', 'price_alerts', 'rewards', 'referrals', 'bank_transactions', 'bank_accounts', 'kyc_submissions', 'copy_trades', 'staking_positions', 'liquidity_sessions'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_updated_at
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

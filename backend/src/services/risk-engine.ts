import { query } from '../db/pool.js';

interface RiskEvaluation {
  score: number;
  level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

export async function evaluateRisk(params: {
  userId: string;
  amountUSD: number;
  orderType?: string;
  symbol?: string;
  fromChain?: string;
  toChain?: string;
  fromToken?: string;
  toToken?: string;
}): Promise<RiskEvaluation> {
  const reasons: string[] = [];
  let score = 0;

  // Amount-based risk
  if (params.amountUSD > 50000) {
    score += 80;
    reasons.push('Amount exceeds $50,000 threshold');
  } else if (params.amountUSD > 10000) {
    score += 50;
    reasons.push('Amount exceeds $10,000 threshold');
  } else if (params.amountUSD > 1000) {
    score += 20;
    reasons.push('Amount exceeds $1,000 threshold');
  }

  // User account risk
  const userResult = await query(
    `SELECT kyc_status, kyc_level, swaps_count, total_volume_usd, ai_risk_score_avg, created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [params.userId],
  );

  if (userResult.rowCount) {
    const user = userResult.rows[0];

    // Account age
    const accountAgeDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
    if (accountAgeDays < 7) {
      score += 10;
      reasons.push('Account less than 7 days old');
    }

    // KYC status
    if (user.kyc_status !== 'verified') {
      score += 25;
      reasons.push('KYC not verified');
    }

    if (user.kyc_level < 2 && params.amountUSD > 10000) {
      score += 15;
      reasons.push('KYC level insufficient for amount');
    }

    // High velocity
    if (user.swaps_count > 100 && params.amountUSD > 10000) {
      score += 5;
    }

    // Existing risk score
    if (Number(user.ai_risk_score_avg) > 50) {
      score += Number(user.ai_risk_score_avg) * 0.1;
      reasons.push('User has elevated historical risk score');
    }
  }

  // Cross-chain risk
  if (params.fromChain && params.toChain && params.fromChain !== params.toChain) {
    score += 15;
    reasons.push(`Cross-chain transfer: ${params.fromChain} → ${params.toChain}`);
  }

  // Stablecoin large transfer
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD'];
  if (params.fromToken && stablecoins.includes(params.fromToken.toUpperCase()) && params.amountUSD > 30000) {
    score += 20;
    reasons.push('Large stablecoin transfer - AML review recommended');
  }

  // Recent activity check
  const recentTrades = await query(
    `SELECT COUNT(*) as recent_count
     FROM orders
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
    [params.userId],
  );
  if (recentTrades.rowCount && Number(recentTrades.rows[0].recent_count) >= 5) {
    score += 30;
    reasons.push('High frequency trading detected (5+ orders/min)');
  }

  score = Math.min(100, Math.max(0, score));

  let level: RiskEvaluation['level'];
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 40) level = 'MEDIUM';
  else if (score >= 20) level = 'LOW';
  else level = 'SAFE';

  return { score, level, reasons };
}

export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'long' | 'short',
  maintenanceMargin = 0.005,
): number {
  if (side === 'long') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
  }
  return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
}

export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  side: 'long' | 'short',
): { pnl: number; pnlPercent: number } {
  const diff = side === 'long' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pnl = diff * quantity;
  const pnlPercent = (diff / entryPrice) * 100;
  return { pnl, pnlPercent };
}

export async function checkAndAddThreatAlert(params: {
  userId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertType: string;
  title: string;
  message: string;
  ipAddress?: string;
}) {
  await query(
    `INSERT INTO threat_alerts (user_id, alert_type, severity, title, message, ip_address, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [params.userId, params.alertType, params.severity, params.title, params.message, params.ipAddress || null],
  );
}

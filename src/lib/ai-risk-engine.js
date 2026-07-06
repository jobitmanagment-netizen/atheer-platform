/**
 * ATHEER AI Risk Engine v2
 * Enhanced risk scoring with USDT-TRC20 support, velocity checks, and pattern detection
 */

export function calculateRisk({ amountUSD, recentSwapsCount = 0, walletAgeDays = 365, chain = 'ETH', accountAgeDays = 365, toChain = null, fromToken = '', toToken = '' }) {
  let score = 0;
  const reasons = [];

  // ── Amount-based risk ──────────────────────────────────
  if (amountUSD > 50000) {
    score += 80;
    reasons.push('معاملة كبيرة تتجاوز $50,000');
  } else if (amountUSD > 10000) {
    score += 50;
    reasons.push('معاملة عالية القيمة تتجاوز $10,000');
  } else if (amountUSD > 1000) {
    score += 20;
  }

  // ── Velocity check ────────────────────────────────────
  if (recentSwapsCount >= 3) {
    score += 40;
    reasons.push('تداول عالي التردد (3+ صفقات/دقيقة)');
  } else if (recentSwapsCount >= 2) {
    score += 20;
    reasons.push('تردد تداول مرتفع (2 صفقة/دقيقة)');
  }

  // ── Wallet age ────────────────────────────────────────
  if (walletAgeDays < 1) {
    score += 30;
    reasons.push('محفظة جديدة أنشئت خلال 24 ساعة');
  } else if (walletAgeDays < 7) {
    score += 10;
    reasons.push('محفظة حديثة الإنشاء (أقل من 7 أيام)');
  }

  // ── TRC20 / TRON specific rules ───────────────────────
  const isTRC20 = chain === 'TRON' || fromToken === 'USDT-TRC20' || toToken === 'USDT-TRC20' || fromToken === 'TRX' || toToken === 'TRX';
  if (isTRC20) {
    if (amountUSD > 5000) {
      score += 25;
      reasons.push('تحويل TRC20 كبير — مراقبة مشددة مطلوبة');
    }
    if (amountUSD > 20000) {
      score += 20;
      reasons.push('تحويل USDT-TRC20 يتجاوز $20,000 — يستوجب KYC');
    }
  }

  // ── Cross-chain risk ──────────────────────────────────
  if (toChain && toChain !== chain) {
    score += 15;
    reasons.push(`تحويل متعدد الشبكات: ${chain} → ${toChain}`);
  }

  // ── Stablecoin large transfer ─────────────────────────
  if ((fromToken === 'USDT' || fromToken === 'USDT-TRC20') && amountUSD > 30000) {
    score += 20;
    reasons.push('تحويل stablecoin كبير — قد يستدعي مراجعة AML');
  }

  // ── Account age ───────────────────────────────────────
  if (accountAgeDays < 7) {
    score += 10;
    reasons.push('حساب جديد — عمر الحساب أقل من 7 أيام');
  }

  score = Math.min(score, 100);

  let level;
  if (score >= 80)      level = 'CRITICAL';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 40) level = 'MEDIUM';
  else if (score >= 20) level = 'LOW';
  else                  level = 'SAFE';

  return { score, level, reasons };
}

export function generateTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

export function generateTronHash() {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

export function generateWalletAddress(chain) {
  const hex     = '0123456789abcdef';
  const alph    = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const base58  = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base36  = '0123456789abcdefghijklmnopqrstuvwxyz';

  switch (chain) {
    case 'TRON': {
      let addr = 'T';
      for (let i = 0; i < 33; i++) addr += alph[Math.floor(Math.random() * alph.length)];
      return addr;
    }
    case 'SOL': {
      let addr = '';
      for (let i = 0; i < 44; i++) addr += base58[Math.floor(Math.random() * base58.length)];
      return addr;
    }
    case 'XRP': {
      let addr = 'r';
      for (let i = 0; i < 33; i++) addr += base36[Math.floor(Math.random() * base36.length)];
      return addr;
    }
    case 'ADA': {
      let addr = 'addr1q';
      for (let i = 0; i < 52; i++) addr += base36[Math.floor(Math.random() * base36.length)];
      return addr;
    }
    case 'DOGE': {
      let addr = 'D';
      for (let i = 0; i < 33; i++) addr += alph[Math.floor(Math.random() * alph.length)];
      return addr;
    }
    case 'AVAX':
    case 'ETH':
    case 'BNB':
    case 'POLY':
    default: {
      let addr = '0x';
      for (let i = 0; i < 40; i++) addr += hex[Math.floor(Math.random() * hex.length)];
      return addr;
    }
  }
}

export function formatUSD(value) {
  if (!value && value !== 0) return '$0.00';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// TRC20 fee estimator (in TRX)
export function estimateTRC20Fee(amountUSD) {
  const baseFee = 10; // TRX
  const energyFee = amountUSD > 1000 ? 20 : 10;
  return baseFee + energyFee;
}

// TRX explorer URL
export function getTronScanUrl(txHash) {
  return `https://tronscan.org/#/transaction/${txHash}`;
}
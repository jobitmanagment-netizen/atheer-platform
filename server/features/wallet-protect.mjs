import { getDb } from '../database.mjs';
import { broadcastToUser } from '../websocket.mjs';
import crypto from 'crypto';

export async function detectAnomaly(userId, action, details) {
  const db = getDb();
  const user = await db('users').where('id', userId).first();
  if (!user) return { risk: 'unknown' };

  const recentTrades = await db('trades').where('user_id', userId).orderBy('created_at', 'desc').limit(10);
  const recentLogins = await db('sessions').where('user_id', userId).orderBy('created_at', 'desc').limit(5);
  const userWallets = await db('wallets').where({ user_id: userId, is_fiat: 0 });

  let riskScore = 0;
  const flags = [];

  const amounts = recentTrades.map(t => t.total);
  const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  if (details?.amount > avgAmount * 5 && avgAmount > 0) {
    riskScore += 30;
    flags.push('UNUSUAL_AMOUNT');
  }

  const walletCount = userWallets.length;
  if (walletCount > 5) {
    const nonZeroWallets = userWallets.filter(w => w.balance > 0).length;
    if (nonZeroWallets < 2) {
      riskScore += 20;
      flags.push('MANY_EMPTY_WALLETS');
    }
  }

  const tradeFrequency = recentTrades.filter(t => Date.now() - new Date(t.created_at).getTime() < 3600000).length;
  if (tradeFrequency > 5) {
    riskScore += 25;
    flags.push('HIGH_FREQUENCY');
  }

  const newSessions = recentLogins.filter(s => Date.now() - new Date(s.created_at).getTime() < 86400000).length;
  if (newSessions > 3) {
    riskScore += 15;
    flags.push('MULTIPLE_SESSIONS');
  }

  const whitelisted = await db('wallet_whitelist').where({ user_id: userId, address: details?.toAddress }).first();
  if (details?.toAddress && !whitelisted) {
    riskScore += 10;
    flags.push('UNKNOWN_ADDRESS');
  }

  const totalBalance = userWallets.reduce((sum, w) => sum + w.balance, 0);
  if (details?.amount > totalBalance * 0.8 && totalBalance > 0) {
    riskScore += 35;
    flags.push('LARGE_WITHDRAWAL');
  }

  const risk = riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : riskScore < 70 ? 'high' : 'critical';
  const action_needed = risk === 'critical' ? 'block' : risk === 'high' ? 'require_2fa' : risk === 'medium' ? 'warn' : 'allow';

  if (riskScore > 20) {
    const alertId = `alrt-${Date.now()}`;
    await db('threat_alerts').insert({
      id: alertId, user_id: userId, type: 'wallet_anomaly',
      severity: risk === 'critical' ? 'high' : risk === 'high' ? 'medium' : 'low',
      title: `Wallet Anomaly Detected (${risk.toUpperCase()})`,
      description: `Risk score: ${riskScore}. Flags: ${flags.join(', ')}. Action: ${action_needed}`,
      source_ip: details?.ip || 'internal',
      created_at: new Date(),
    });
    broadcastToUser(userId, { type: 'security_alert', payload: { id: alertId, risk, riskScore, flags, action: action_needed } });
  }

  return { risk, riskScore, flags, action: action_needed };
}

export async function whitelistAddress(userId, address, label) {
  if (!address) throw new Error('Address required');
  const db = getDb();
  const id = `wl-${Date.now()}`;
  await db('wallet_whitelist').insert({ id, user_id: userId, address, label: label || 'Trusted', created_at: new Date() });
  return { success: true };
}

export async function getWhitelist(userId) {
  const db = getDb();
  return await db('wallet_whitelist').where('user_id', userId).orderBy('created_at', 'desc');
}

export async function removeWhitelist(userId, id) {
  const db = getDb();
  await db('wallet_whitelist').where({ id, user_id: userId }).del();
  return { success: true };
}

export async function setWithdrawalLimit(userId, daily, tx) {
  const db = getDb();
  const existing = await db('wallet_limits').where('user_id', userId).first();
  if (existing) {
    await db('wallet_limits').where('user_id', userId).update({ daily_limit: parseFloat(daily), tx_limit: parseFloat(tx || daily) });
  } else {
    await db('wallet_limits').insert({ id: `wl-${Date.now()}`, user_id: userId, daily_limit: parseFloat(daily), tx_limit: parseFloat(tx || daily) });
  }
  return { success: true };
}

export async function getWalletLimits(userId) {
  const db = getDb();
  const limits = await db('wallet_limits').where('user_id', userId).first();
  const todayTxs = await db('withdraw_requests').where('user_id', userId).where('created_at', '>=', new Date(Date.now() - 86400000)).sum('amount as total').first();
  const totalWallets = await db('wallets').where({ user_id: userId, is_fiat: 0 }).sum('balance as total').first();
  return {
    dailyLimit: limits?.daily_limit || 50000,
    txLimit: limits?.tx_limit || 10000,
    usedToday: todayTxs?.total || 0,
    totalBalance: totalWallets?.total || 0,
    remainingDaily: (limits?.daily_limit || 50000) - (todayTxs?.total || 0),
  };
}

export async function generateColdWallet(userId) {
  const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1', publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const db = getDb();
  const id = `cw-${Date.now()}`;
  await db('cold_wallets').insert({
    id, user_id: userId, public_key: keyPair.publicKey,
    encrypted_private_key: crypto.createHash('sha256').update(keyPair.privateKey).digest('hex'),
    status: 'active', created_at: new Date(),
  });
  return { success: true, publicKey: keyPair.publicKey, message: 'Store private key offline. This is the only time it is shown.' };
}

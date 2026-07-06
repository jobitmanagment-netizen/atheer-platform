import { getDb } from '../database.mjs';
import { randomUUID } from 'crypto';

export async function listStrategies(filters = {}) {
  const db = getDb();
  let query = db('marketplace_strategies').where('status', 'published');
  if (filters.type) query = query.where('type', filters.type);
  if (filters.minReturn) query = query.where('avg_monthly_return', '>=', parseFloat(filters.minReturn));
  if (filters.maxPrice) query = query.where('price', '<=', parseFloat(filters.maxPrice));
  if (filters.search) query = query.where('name', 'like', `%${filters.search}%`);
  const strategies = await query.orderBy('copies', 'desc').limit(50);
  for (const s of strategies) {
    const creator = await db('users').where('id', s.creator_id).select('full_name', 'tier').first();
    s.creator = creator || { full_name: 'Anonymous', tier: 'bronze' };
  }
  return strategies;
}

export async function createStrategy(userId, data) {
  const { name, description, type, code, price, avg_monthly_return, max_drawdown, risk_level, tags } = data;
  if (!name || !type || !code) throw new Error('name, type, and code required');
  const db = getDb();
  const id = `strat-${Date.now()}`;
  const version = '1.0.0';
  await db('marketplace_strategies').insert({
    id, creator_id: userId, name, description: description || '', type, code,
    price: parseFloat(price || 0), avg_monthly_return: parseFloat(avg_monthly_return || 0),
    max_drawdown: parseFloat(max_drawdown || 0), risk_level: risk_level || 'medium',
    tags: JSON.stringify(tags || []), version, copies: 0, rating: 0, reviews_count: 0,
    status: 'published', created_at: new Date(),
  });
  return await db('marketplace_strategies').where('id', id).first();
}

export async function purchaseStrategy(userId, strategyId) {
  const db = getDb();
  const strategy = await db('marketplace_strategies').where('id', strategyId).first();
  if (!strategy) throw new Error('Strategy not found');
  if (strategy.price > 0) {
    const wallet = await db('wallets').where({ user_id: userId, currency: 'USDT' }).first();
    if (!wallet || wallet.balance < strategy.price) throw new Error(`Insufficient USDT balance. Need ${strategy.price} USDT`);
    await db('wallets').where('id', wallet.id).decrement('balance', strategy.price);
    await db('wallets').where({ user_id: strategy.creator_id, currency: 'USDT' }).increment('balance', strategy.price * 0.95);
    await db('marketplace_strategies').where('id', strategyId).increment('copies', 1);
  }
  const id = `sub-${Date.now()}`;
  await db('marketplace_subscriptions').insert({ id, user_id: userId, strategy_id: strategyId, purchased_at: new Date() });
  return { success: true, strategy };
}

export async function getUserStrategies(userId) {
  const db = getDb();
  const created = await db('marketplace_strategies').where('creator_id', userId).orderBy('created_at', 'desc');
  const subs = await db('marketplace_subscriptions').where('user_id', userId);
  const subscribed = await db('marketplace_strategies').whereIn('id', subs.map(s => s.strategy_id));
  return { created, subscribed };
}

export async function submitReview(userId, strategyId, rating, comment) {
  const db = getDb();
  const existing = await db('marketplace_reviews').where({ user_id: userId, strategy_id: strategyId }).first();
  if (existing) throw new Error('Already reviewed');
  const id = `rev-${Date.now()}`;
  await db('marketplace_reviews').insert({ id, user_id: userId, strategy_id: strategyId, rating: Math.min(5, Math.max(1, parseInt(rating))), comment: comment || '', created_at: new Date() });
  const stats = await db('marketplace_reviews').where('strategy_id', strategyId).avg('rating as avg').count('* as count').first();
  await db('marketplace_strategies').where('id', strategyId).update({ rating: stats.avg || 0, reviews_count: stats.count || 0 });
  return { success: true };
}

export async function getStrategyPerformance(strategyId) {
  const db = getDb();
  const strategy = await db('marketplace_strategies').where('id', strategyId).first();
  if (!strategy) throw new Error('Strategy not found');
  const history = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    history.push({ date: d.toISOString().slice(0, 10), value: strategy.avg_monthly_return * (1 + (Math.random() - 0.5) * 0.1) * (30 - i) / 30 });
  }
  return { history, avgMonthlyReturn: strategy.avg_monthly_return, maxDrawdown: strategy.max_drawdown, riskLevel: strategy.risk_level };
}

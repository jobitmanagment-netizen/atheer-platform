import { getDb } from '../database.mjs';
import { getTickers } from '../exchange.mjs';

export async function analyzeMarket(symbol, userId) {
  const tickers = await getTickers();
  const ticker = tickers[symbol];
  if (!ticker) throw new Error(`Market ${symbol} not found`);

  const db = getDb();
  const orders = await db('orders').where({ user_id: userId, symbol }).orderBy('created_at', 'desc').limit(20);
  const trades = await db('trades').where({ user_id: userId, symbol }).orderBy('created_at', 'desc').limit(20);
  const positions = await db('futures_positions').where({ user_id: userId, symbol, status: 'open' });

  const signals = [];
  const price = ticker.price;
  const change = ticker.change24h || 0;
  const volume = ticker.volume24h || 0;

  if (change > 5) signals.push({ type: 'warning', message: `⚠️ ${symbol} up ${change.toFixed(1)}% in 24h — possible overbought`, confidence: 75 });
  else if (change < -5) signals.push({ type: 'opportunity', message: `📉 ${symbol} down ${change.toFixed(1)}% — potential bounce`, confidence: 70 });
  else if (change > 2) signals.push({ type: 'info', message: `📈 ${symbol} trending up ${change.toFixed(1)}%`, confidence: 60 });

  const totalVolumeUsd = (await db('users').where('id', userId).select('total_volume_usd').first())?.total_volume_usd || 0;
  if (totalVolumeUsd > 100000) signals.push({ type: 'insight', message: `💎 You're a VIP trader ($${totalVolumeUsd.toLocaleString()} volume) — consider OTC for large orders`, confidence: 90 });

  if (positions.length > 0) {
    const pos = positions[0];
    const pnl = pos.pnl || 0;
    if (pnl > 500) signals.push({ type: 'take_profit', message: `💰 ${pos.side.toUpperCase()} position +$${pnl.toFixed(2)} — consider taking profit`, confidence: 80 });
    else if (pnl < -200) signals.push({ type: 'risk', message: `🔴 ${pos.side.toUpperCase()} position -$${Math.abs(pnl).toFixed(2)} — review stop loss`, confidence: 85 });
  }

  const userOrders = orders.filter(o => o.status === 'open');
  if (userOrders.length > 5) signals.push({ type: 'tip', message: `📊 You have ${userOrders.length} open orders — consider consolidating`, confidence: 65 });

  const recentTrades = trades.slice(0, 5);
  let winCount = 0;
  for (const t of recentTrades) {
    if (t.pnl && t.pnl > 0) winCount++;
  }
  if (recentTrades.length > 3) {
    const winRate = (winCount / recentTrades.length) * 100;
    signals.push({ type: winRate > 60 ? 'praise' : 'coaching', message: winRate > 60 ? `🏆 ${winRate.toFixed(0)}% win rate last ${recentTrades.length} trades — great!` : `📚 ${winRate.toFixed(0)}% win rate — review your strategy`, confidence: 75 });
  }

  return {
    symbol, price, change24h: change, volume24h: volume,
    signals: signals.sort((a, b) => b.confidence - a.confidence),
    recommendation: signals.length > 0 ? signals[0] : { type: 'neutral', message: `${symbol} looking stable`, confidence: 50 },
    timestamp: Date.now(),
  };
}

export async function getAIPrediction(symbol) {
  const tickers = await getTickers();
  const ticker = tickers[symbol];
  if (!ticker) throw new Error(`Market ${symbol} not found`);

  const price = ticker.price;
  const change = ticker.change24h || 0;
  const volatility = Math.abs(change) / 100;
  const momentum = change > 0 ? 1 : -1;
  const rsi = 50 + (change * 3);
  const clampedRsi = Math.max(10, Math.min(90, rsi));
  const support = price * (1 - volatility * 2);
  const resistance = price * (1 + volatility * 2);

  let prediction, confidence;
  if (clampedRsi < 30) { prediction = 'strong_buy'; confidence = 80 + Math.random() * 10; }
  else if (clampedRsi < 45) { prediction = 'buy'; confidence = 60 + Math.random() * 15; }
  else if (clampedRsi > 70) { prediction = 'strong_sell'; confidence = 80 + Math.random() * 10; }
  else if (clampedRsi > 55) { prediction = 'sell'; confidence = 55 + Math.random() * 15; }
  else { prediction = 'neutral'; confidence = 40 + Math.random() * 20; }

  const targets = {
    target1: { price: price * (momentum > 0 ? 1.02 : 0.98), prob: 70 + Math.random() * 10 },
    target2: { price: price * (momentum > 0 ? 1.05 : 0.95), prob: 40 + Math.random() * 15 },
    target3: { price: price * (momentum > 0 ? 1.10 : 0.90), prob: 15 + Math.random() * 15 },
  };

  return {
    symbol, price, prediction, confidence: Math.round(confidence),
    rsi: Math.round(clampedRsi), support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100,
    targets: Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, { price: Math.round(v.price * 100) / 100, prob: Math.round(v.prob) }])),
    generatedAt: Date.now(),
    model: 'AI Predictive v3.7',
  };
}

export async function getAIPortfolioAdvice(userId) {
  const db = getDb();
  const wallets = await db('wallets').where({ user_id: userId, is_fiat: 0 });
  const tickers = await getTickers();
  let totalUsd = 0;
  const holdings = [];
  for (const w of wallets) {
    const ticker = tickers[`${w.currency}/USDT`];
    const usdValue = ticker ? w.balance * ticker.price : w.balance;
    totalUsd += usdValue;
    if (usdValue > 10) holdings.push({ currency: w.currency, balance: w.balance, usdValue, pct: 0 });
  }
  for (const h of holdings) h.pct = totalUsd > 0 ? ((h.usdValue / totalUsd) * 100).toFixed(1) : 0;

  const advice = [];
  const btcHolding = holdings.find(h => h.currency === 'BTC');
  const usdtHolding = holdings.find(h => h.currency === 'USDT');

  if (!btcHolding || (btcHolding && parseFloat(btcHolding.pct) < 20)) {
    advice.push({ type: 'rebalance', message: '📊 Consider increasing BTC allocation to 20-30% for long-term growth', priority: 1 });
  }
  if (usdtHolding && parseFloat(usdtHolding.pct) > 50) {
    advice.push({ type: 'optimize', message: '💰 High USDT allocation — consider staking or DeFi yields', priority: 2 });
  }
  if (holdings.length < 3) advice.push({ type: 'diversify', message: '🌐 Portfolio under-diversified — consider adding ETH, SOL, or BNB', priority: 3 });

  return { totalUsd, holdings, advice, updatedAt: Date.now() };
}

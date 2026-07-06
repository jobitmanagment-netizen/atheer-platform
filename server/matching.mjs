import { getDb } from './database.mjs';
import { broadcastToUser, broadcastAll } from './websocket.mjs';
import { randomUUID } from 'crypto';

const orderBooks = new Map();
const BPS = 10;

export async function placeOrder(userId, symbol, type, side, price, amount) {
  const db = getDb();
  const market = await db('markets').where('symbol', symbol).first();
  if (!market) throw new Error(`Market not found: ${symbol}`);

  const wallet = await db('wallets').where({ user_id: userId, currency: market.quote }).first();
  let required;

  if (side === 'buy') {
    const cost = type === 'market' ? amount * market.price : amount * price;
    required = cost;
    if (wallet && wallet.balance < required) throw new Error(`Insufficient ${market.quote} balance: need ${required.toFixed(2)}, have ${wallet.balance.toFixed(2)}`);
  } else {
    const baseWallet = await db('wallets').where({ user_id: userId, currency: market.base }).first();
    required = amount;
    if (baseWallet && baseWallet.balance < required) throw new Error(`Insufficient ${market.base} balance: need ${required}, have ${baseWallet.balance.toFixed(4)}`);
    if (side === 'sell') {
      const lockedMarket = await db('wallets').where({ user_id: userId, currency: market.quote }).first();
      required = type === 'market' ? amount * market.price : amount * price;
    }
  }

  const orderId = `ord-${Date.now()}-${randomUUID().slice(0, 8)}`;

  if (type === 'market') {
    const execPrice = market.price;
    const total = execPrice * amount;
    const fee = total * 0.0008;

    if (side === 'buy') {
      await db('wallets').where({ user_id: userId, currency: market.quote }).decrement('balance', total);
      let baseWallet = await db('wallets').where({ user_id: userId, currency: market.base }).first();
      if (baseWallet) {
        await db('wallets').where({ user_id: userId, currency: market.base }).increment('balance', amount);
      } else {
        await db('wallets').insert({ id: `w-${orderId}`, user_id: userId, currency: market.base, balance: amount });
      }
    } else {
      await db('wallets').where({ user_id: userId, currency: market.base }).decrement('balance', amount);
      await db('wallets').where({ user_id: userId, currency: market.quote }).increment('balance', total - fee);
    }

    await db('orders').insert({
      id: orderId, user_id: userId, symbol, type, side,
      price: execPrice, amount, filled: amount, status: 'filled',
      created_at: new Date(), updated_at: new Date(),
    });

    await db('trades').insert({
      id: `tr-${Date.now()}`, user_id: userId, symbol, side,
      price: execPrice, amount, total, fee,
      created_at: new Date(),
    });

    await db('users').where('id', userId).increment({ total_volume_usd: total, swaps_count: 1 });

    await db('notifications').insert({
      id: `n-${Date.now()}`, user_id: userId, type: 'market_filled',
      title: 'Market Order Executed', message: `${side.toUpperCase()} ${amount} ${symbol} @ $${execPrice.toFixed(2)}`,
      created_at: new Date(),
    });

    broadcastToUser(userId, { type: 'order_update', payload: { id: orderId, status: 'filled', price: execPrice, amount, side, symbol } });
    broadcastAll({ type: 'trade', payload: { symbol, side, price: execPrice, amount, timestamp: Date.now() } });

    return { id: orderId, status: 'filled', price: execPrice, filled: amount, total, fee };
  }

  await db('orders').insert({
    id: orderId, user_id: userId, symbol, type, side,
    price, amount, filled: 0, status: 'open',
    created_at: new Date(), updated_at: new Date(),
  });

  if (!orderBooks.has(symbol)) orderBooks.set(symbol, { bids: [], asks: [] });
  const ob = orderBooks.get(symbol);
  const entry = { id: orderId, userId, price, amount, remaining: amount, side, createdAt: Date.now() };
  if (side === 'buy') ob.bids.push(entry);
  else ob.asks.push(entry);
  ob.bids.sort((a, b) => b.price - a.price || a.createdAt - b.createdAt);
  ob.asks.sort((a, b) => a.price - b.price || a.createdAt - b.createdAt);

  await tryMatch(symbol);
  broadcastToUser(userId, { type: 'order_update', payload: { id: orderId, status: 'open', price, amount, side, symbol } });

  return { id: orderId, status: 'open', price, amount };
}

async function tryMatch(symbol) {
  const db = getDb();
  const ob = orderBooks.get(symbol);
  if (!ob) return;

  let matched = false;
  while (ob.bids.length > 0 && ob.asks.length > 0) {
    const bestBid = ob.bids[0];
    const bestAsk = ob.asks[0];
    if (bestBid.price < bestAsk.price) break;

    matched = true;
    const matchPrice = (bestBid.price + bestAsk.price) / 2;
    const matchAmount = Math.min(bestBid.remaining, bestAsk.remaining);
    const total = matchPrice * matchAmount;
    const bidFee = total * 0.0008;
    const askFee = total * 0.0008;

    await db('orders').where('id', bestBid.id).increment('filled', matchAmount);
    await db('orders').where('id', bestAsk.id).increment('filled', matchAmount);

    const bidOrder = await db('orders').where('id', bestBid.id).first();
    const askOrder = await db('orders').where('id', bestAsk.id).first();
    if (bidOrder && bidOrder.filled >= bidOrder.amount) {
      await db('orders').where('id', bestBid.id).update({ status: 'filled', updated_at: new Date() });
      ob.bids.shift();
    }
    if (askOrder && askOrder.filled >= askOrder.amount) {
      await db('orders').where('id', bestAsk.id).update({ status: 'filled', updated_at: new Date() });
      ob.asks.shift();
    }

    bestBid.remaining -= matchAmount;
    bestAsk.remaining -= matchAmount;

    await db('trades').insert({
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: bestBid.userId, symbol, side: 'buy', price: matchPrice, amount: matchAmount, total, fee: bidFee,
      created_at: new Date(),
    });
    await db('trades').insert({
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: bestAsk.userId, symbol, side: 'sell', price: matchPrice, amount: matchAmount, total, fee: askFee,
      created_at: new Date(),
    });

    await db('users').where('id', bestBid.userId).increment({ total_volume_usd: total, swaps_count: 1 });
    await db('users').where('id', bestAsk.userId).increment({ total_volume_usd: total, swaps_count: 1 });

    broadcastToUser(bestBid.userId, {
      type: 'order_matched', payload: { id: bestBid.id, symbol, side: 'buy', price: matchPrice, amount: matchAmount, total, fee: bidFee },
    });
    broadcastToUser(bestAsk.userId, {
      type: 'order_matched', payload: { id: bestAsk.id, symbol, side: 'sell', price: matchPrice, amount: matchAmount, total, fee: askFee },
    });
    broadcastAll({ type: 'trade', payload: { symbol, side: 'buy', price: matchPrice, amount: matchAmount, timestamp: Date.now() } });
  }
}

export async function cancelOrder(userId, orderId) {
  const db = getDb();
  const order = await db('orders').where({ id: orderId, user_id: userId }).first();
  if (!order) throw new Error('Order not found');
  if (order.status !== 'open') throw new Error('Order already filled/cancelled');

  await db('orders').where('id', orderId).update({ status: 'cancelled', updated_at: new Date() });

  if (orderBooks.has(order.symbol)) {
    const ob = orderBooks.get(order.symbol);
    ob.bids = ob.bids.filter(o => o.id !== orderId);
    ob.asks = ob.asks.filter(o => o.id !== orderId);
  }

  broadcastToUser(userId, { type: 'order_cancelled', payload: { id: orderId } });
  return { success: true };
}

export function getOrderBookSnapshot(symbol, limit = 20) {
  const ob = orderBooks.get(symbol);
  if (!ob) return { bids: [], asks: [] };
  return {
    bids: ob.bids.slice(0, limit).map(o => [o.price, o.remaining]),
    asks: ob.asks.slice(0, limit).map(o => [o.price, o.remaining]),
  };
}

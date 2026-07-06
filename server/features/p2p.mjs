import { getDb } from '../database.mjs';
import { broadcastAll } from '../websocket.mjs';
import { randomUUID } from 'crypto';

const P2P_FEE = 0.005;

export async function getP2PAdvertisements(filters = {}) {
  const db = getDb();
  let query = db('p2p_advertisements').where('status', 'active');
  if (filters.currency) query = query.where('currency', filters.currency);
  if (filters.type) query = query.where('type', filters.type);
  if (filters.fiat) query = query.where('fiat', filters.fiat);
  if (filters.minAmount) query = query.where('min_amount', '<=', parseFloat(filters.minAmount));
  if (filters.maxAmount) query = query.where('max_amount', '>=', parseFloat(filters.maxAmount));
  const ads = await query.orderBy('price', 'asc').limit(50);
  for (const ad of ads) {
    const owner = await db('users').where('id', ad.user_id).select('full_name', 'email', 'kyc_status', 'tier').first();
    ad.owner = owner || {};
    ad.completedOrders = (await db('p2p_orders').where({ advertiser_id: ad.user_id }).count('* as c').first()).c;
  }
  return ads;
}

export async function createP2PAd(userId, data) {
  const { type, currency, fiat, price, min_amount, max_amount, total_available, payment_methods, terms } = data;
  if (!type || !currency || !fiat || !price || !total_available) throw new Error('Missing required fields');
  const db = getDb();
  const id = `p2p-${Date.now()}`;
  await db('p2p_advertisements').insert({
    id, user_id: userId, type, currency, fiat, price: parseFloat(price),
    min_amount: parseFloat(min_amount || 10), max_amount: parseFloat(max_amount || total_available),
    total_available: parseFloat(total_available), remaining: parseFloat(total_available),
    payment_methods: JSON.stringify(payment_methods || ['Bank Transfer']),
    terms: terms || '', status: 'active', created_at: new Date(),
  });
  const ad = await db('p2p_advertisements').where('id', id).first();
  broadcastAll({ type: 'p2p_new_ad', payload: ad });
  return ad;
}

export async function createP2POrder(userId, adId, amount, fiatAmount) {
  const db = getDb();
  const ad = await db('p2p_advertisements').where('id', adId).first();
  if (!ad || ad.status !== 'active') throw new Error('Advertisement not available');
  if (userId === ad.user_id) throw new Error('Cannot buy from yourself');
  if (amount < ad.min_amount || amount > ad.max_amount) throw new Error('Amount out of range');
  if (amount > ad.remaining) throw new Error('Insufficient remaining amount');

  const id = `p2pord-${Date.now()}`;
  const tradeId = `tr-${randomUUID().slice(0, 8)}`;

  await db('p2p_advertisements').where('id', adId).decrement('remaining', amount);
  await db('p2p_orders').insert({
    id, trade_id: tradeId, ad_id: adId,
    buyer_id: ad.type === 'sell' ? userId : ad.user_id,
    seller_id: ad.type === 'sell' ? ad.user_id : userId,
    currency: ad.currency, fiat: ad.fiat, amount, fiat_amount: fiatAmount || amount * ad.price,
    price: ad.price, status: 'pending', payment_method: JSON.parse(ad.payment_methods || '["Bank Transfer"]')[0],
    created_at: new Date(), expires_at: new Date(Date.now() + 3600000),
  });

  broadcastAll({ type: 'p2p_new_order', payload: { id, tradeId, amount, currency: ad.currency, fiat: ad.fiat } });
  return { id, tradeId };
}

export async function confirmP2POrder(userId, orderId) {
  const db = getDb();
  const order = await db('p2p_orders').where('id', orderId).first();
  if (!order) throw new Error('Order not found');
  if (order.seller_id !== userId && order.buyer_id !== userId) throw new Error('Not your order');

  if (order.status === 'paid') {
    await db('p2p_orders').where('id', orderId).update({ status: 'completed', completed_at: new Date() });
    const fee = order.fiat_amount * P2P_FEE;
    const sellerAmount = order.fiat_amount - fee;
    await db('wallets').where({ user_id: order.seller_id, currency: order.fiat }).increment('balance', sellerAmount);
    await db('users').where('id', order.seller_id).increment({ total_volume_usd: order.fiat_amount });
    broadcastAll({ type: 'p2p_completed', payload: { id: orderId, tradeId: order.trade_id } });
    return { success: true, completed: true };
  }

  if (order.status === 'pending') {
    await db('p2p_orders').where('id', orderId).update({ status: 'paid', paid_at: new Date() });
    broadcastAll({ type: 'p2p_paid', payload: { id: orderId, tradeId: order.trade_id } });
    return { success: true, status: 'paid' };
  }

  throw new Error('Order cannot be confirmed in current status');
}

export async function cancelP2POrder(userId, orderId) {
  const db = getDb();
  const order = await db('p2p_orders').where('id', orderId).first();
  if (!order) throw new Error('Order not found');
  if (order.buyer_id !== userId) throw new Error('Only buyer can cancel');
  if (order.status !== 'pending') throw new Error('Cannot cancel at this stage');
  await db('p2p_orders').where('id', orderId).update({ status: 'cancelled' });
  await db('p2p_advertisements').where('id', order.ad_id).increment('remaining', order.amount);
  return { success: true };
}

export async function getP2POrders(userId) {
  const db = getDb();
  const orders = await db('p2p_orders').where(function() {
    this.where('buyer_id', userId).orWhere('seller_id', userId);
  }).orderBy('created_at', 'desc').limit(50);
  for (const o of orders) {
    const buyer = await db('users').where('id', o.buyer_id).select('full_name').first();
    const seller = await db('users').where('id', o.seller_id).select('full_name').first();
    o.buyer = buyer || {};
    o.seller = seller || {};
  }
  return orders;
}

export async function getP2PPaymentMethods() {
  return [
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', time: '1-24 hours' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', time: 'Instant' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', time: 'Instant' },
    { id: 'usdt', name: 'USDT (TRC20)', icon: '💎', time: '5 min' },
    { id: 'cash', name: 'Cash Deposit', icon: '💰', time: '1-2 hours' },
    { id: 'wise', name: 'Wise/TransferWise', icon: '🌐', time: '1-24 hours' },
    { id: 'revolut', name: 'Revolut', icon: '🔄', time: 'Instant' },
    { id: 'mobile', name: 'Mobile Money', icon: '📱', time: 'Instant' },
  ];
}

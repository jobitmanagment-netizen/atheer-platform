import { getDb } from '../database.mjs';
import { broadcastToUser, broadcastAll } from '../websocket.mjs';

export async function createRoom(userId, data) {
  const { name, description, type, max_members, is_private, tags } = data;
  if (!name) throw new Error('Room name required');
  const db = getDb();
  const id = `room-${Date.now()}`;
  await db('social_rooms').insert({
    id, creator_id: userId, name, description: description || '',
    type: type || 'trading', max_members: parseInt(max_members || 100),
    is_private: is_private ? 1 : 0, tags: JSON.stringify(tags || []),
    member_count: 1, status: 'active', created_at: new Date(),
  });
  await db('social_room_members').insert({ id: `rm-${Date.now()}`, room_id: id, user_id: userId, role: 'admin', joined_at: new Date() });
  broadcastAll({ type: 'room_created', payload: { id, name, creatorId: userId } });
  return await db('social_rooms').where('id', id).first();
}

export async function listRooms(filters = {}) {
  const db = getDb();
  let query = db('social_rooms').where({ status: 'active', is_private: 0 });
  if (filters.type) query = query.where('type', filters.type);
  if (filters.search) query = query.where('name', 'like', `%${filters.search}%`);
  const rooms = await query.orderBy('member_count', 'desc').limit(50);
  for (const r of rooms) {
    r.tags = JSON.parse(r.tags || '[]');
    const creator = await db('users').where('id', r.creator_id).select('full_name', 'tier').first();
    r.creator = creator || { full_name: 'Unknown', tier: 'bronze' };
  }
  return rooms;
}

export async function joinRoom(userId, roomId) {
  const db = getDb();
  const room = await db('social_rooms').where('id', roomId).first();
  if (!room) throw new Error('Room not found');
  const existing = await db('social_room_members').where({ room_id: roomId, user_id: userId }).first();
  if (existing) throw new Error('Already a member');
  if (room.member_count >= room.max_members) throw new Error('Room is full');
  await db('social_room_members').insert({ id: `rm-${Date.now()}`, room_id: roomId, user_id: userId, role: 'member', joined_at: new Date() });
  await db('social_rooms').where('id', roomId).increment('member_count', 1);
  broadcastToUser(room.creator_id, { type: 'room_join', payload: { roomId, userId } });
  return { success: true };
}

export async function leaveRoom(userId, roomId) {
  const db = getDb();
  await db('social_room_members').where({ room_id: roomId, user_id: userId }).del();
  await db('social_rooms').where('id', roomId).decrement('member_count', 1);
  return { success: true };
}

export async function sendRoomMessage(userId, roomId, content, type = 'text') {
  if (!content) throw new Error('Message content required');
  const db = getDb();
  const member = await db('social_room_members').where({ room_id: roomId, user_id: userId }).first();
  if (!member) throw new Error('Not a room member');
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const user = await db('users').where('id', userId).select('full_name', 'avatar', 'tier').first();
  const msg = { id, roomId, userId, userName: user?.full_name || 'User', avatar: user?.avatar, tier: user?.tier, content, type, createdAt: Date.now() };
  await db('social_messages').insert({
    id, room_id: roomId, user_id: userId, content, message_type: type,
    user_name: user?.full_name || 'User', user_tier: user?.tier, created_at: new Date(),
  });
  broadcastAll({ type: 'room_message', payload: msg });
  return msg;
}

export async function getRoomMessages(roomId, limit = 50) {
  const db = getDb();
  const messages = await db('social_messages').where('room_id', roomId).orderBy('created_at', 'desc').limit(limit);
  return messages.reverse();
}

export async function getRoomMembers(roomId) {
  const db = getDb();
  const members = await db('social_room_members').where('room_id', roomId);
  for (const m of members) {
    const user = await db('users').where('id', m.user_id).select('full_name', 'avatar', 'tier').first();
    m.user = user || { full_name: 'Unknown', tier: 'bronze' };
  }
  return members;
}

export async function createSignal(userId, data) {
  const { roomId, symbol, direction, entry, target, stoploss, confidence, analysis } = data;
  if (!symbol || !direction || !entry) throw new Error('symbol, direction, entry required');
  const db = getDb();
  const id = `sig-${Date.now()}`;
  const signal = {
    id, creator_id: userId, room_id: roomId || null, symbol, direction,
    entry: parseFloat(entry), target: target ? parseFloat(target) : null,
    stoploss: stoploss ? parseFloat(stoploss) : null,
    confidence: parseInt(confidence || 75), analysis: analysis || '',
    status: 'active', hits: 0, misses: 0, created_at: new Date(),
  };
  await db('trading_signals').insert(signal);
  const user = await db('users').where('id', userId).select('full_name', 'tier').first();
  signal.creator = user || { full_name: 'Trader', tier: 'bronze' };
  broadcastAll({ type: 'new_signal', payload: signal });
  return signal;
}

export async function listSignals(filters = {}) {
  const db = getDb();
  let query = db('trading_signals').where('status', 'active').orderBy('created_at', 'desc').limit(50);
  if (filters.symbol) query = db('trading_signals').where('symbol', filters.symbol).orderBy('created_at', 'desc').limit(50);
  if (filters.roomId) query = db('trading_signals').where('room_id', filters.roomId).orderBy('created_at', 'desc').limit(50);
  const signals = await query;
  for (const s of signals) {
    const user = await db('users').where('id', s.creator_id).select('full_name', 'tier').first();
    s.creator = user || { full_name: 'Trader', tier: 'bronze' };
    s.hitRate = s.hits + s.misses > 0 ? Math.round((s.hits / (s.hits + s.misses)) * 100) : 0;
  }
  return signals;
}

import { getTickers } from './exchange.mjs';
import websocket from '@fastify/websocket';

const clients = new Map();
let broadcastInterval;

export async function setupWebSocket(fastify) {
  await fastify.register(websocket);

  fastify.get('/ws', { websocket: true }, (socket, req) => {
    const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client = { id, socket, subscriptions: new Set(), userId: null };
    clients.set(id, client);

    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, payload } = msg;

        switch (type) {
          case 'subscribe':
            if (payload?.channels) {
              payload.channels.forEach(ch => client.subscriptions.add(ch));
              socket.send(JSON.stringify({ type: 'subscribed', payload: { channels: [...client.subscriptions] } }));
            }
            break;

          case 'unsubscribe':
            if (payload?.channels) {
              payload.channels.forEach(ch => client.subscriptions.delete(ch));
            }
            break;

          case 'auth':
            client.userId = payload?.userId || null;
            socket.send(JSON.stringify({ type: 'auth_ok' }));
            break;

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (e) {
        socket.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });

    socket.on('close', () => {
      clients.delete(id);
    });

    socket.send(JSON.stringify({ type: 'connected', payload: { clientId: id } }));
  });

  if (!broadcastInterval) {
    broadcastInterval = setInterval(broadcastTickers, 5000);
  }
}

async function broadcastTickers() {
  if (clients.size === 0) return;

  try {
    const tickers = await getTickers();
    const msg = JSON.stringify({ type: 'tickers', payload: { tickers, timestamp: Date.now() } });

    for (const client of clients.values()) {
      if (client.subscriptions.has('tickers') || client.subscriptions.has('*')) {
        try {
          client.socket.send(msg);
        } catch (e) {
          clients.delete(client.id);
        }
      }
    }
  } catch (e) {
    console.error('Broadcast error:', e.message);
  }
}

export function broadcastToUser(userId, data) {
  const msg = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.userId === userId) {
      try {
        client.socket.send(msg);
      } catch (e) {
        clients.delete(client.id);
      }
    }
  }
}

export function broadcastAll(data) {
  const msg = JSON.stringify(data);
  for (const client of clients.values()) {
    try {
      client.socket.send(msg);
    } catch (e) {
      clients.delete(client.id);
    }
  }
}

export function stopWebSocket() {
  if (broadcastInterval) clearInterval(broadcastInterval);
  for (const client of clients.values()) {
    try { client.socket.close(); } catch (e) { /* ignore */ }
  }
  clients.clear();
}

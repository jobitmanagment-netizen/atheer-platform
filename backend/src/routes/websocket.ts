import type { FastifyInstance } from 'fastify';

interface ClientConn {
  socket: any;
  symbols?: string[];
}

let clients = new Set<ClientConn>();
let priceInterval: ReturnType<typeof setInterval> | null = null;

function broadcast(data: any) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    try {
      client.socket.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

async function fetchPrices(): Promise<any[]> {
  try {
    const { query } = await import('../db/pool.js');
    const result = await query(
      `SELECT symbol, last_price, change_24h, volume_24h, high_24h, low_24h
       FROM markets WHERE enabled = TRUE`,
    );
    return result.rows.map((r: any) => ({
      symbol: r.symbol,
      price: Number(r.last_price),
      change24h: Number(r.change_24h),
      volume24h: Number(r.volume_24h),
      high24h: Number(r.high_24h),
      low24h: Number(r.low_24h),
      timestamp: Date.now(),
    }));
  } catch {
    return [];
  }
}

function startPriceBroadcast() {
  if (priceInterval) return;
  priceInterval = setInterval(async () => {
    const prices = await fetchPrices();
    if (prices.length > 0) {
      broadcast({ type: 'prices', data: prices, timestamp: Date.now() });
    }
  }, 2000);
}

export function registerWebSocketRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true } as any, (socket: any, req: any) => {
    const client: ClientConn = { socket };
    clients.add(client);
    startPriceBroadcast();

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
          client.symbols = msg.symbols.map((s: string) => s.toUpperCase());
          socket.send(JSON.stringify({ type: 'subscribed', symbols: client.symbols }));
        }
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore invalid messages
      }
    });

    socket.on('close', () => {
      clients.delete(client);
      if (clients.size === 0 && priceInterval) {
        clearInterval(priceInterval);
        priceInterval = null;
      }
    });

    socket.send(JSON.stringify({ type: 'connected', message: 'ATHEER WebSocket connected', timestamp: Date.now() }));
  });
}

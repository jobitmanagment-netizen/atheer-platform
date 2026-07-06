import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PAIRS = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'SOL-USDT'];
const OKX_WS_PUBLIC = 'wss://ws.okx.com:8443/ws/v5/public';

/**
 * Live BTC/ETH/BNB/SOL prices on the landing hero, streamed from OKX public WS.
 * Pure presentational marketing widget — no auth, no app data.
 */
export default function LiveHeroPrices() {
  const [prices, setPrices] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    let closed = false;
    let reconnect = null;

    const connect = () => {
      const ws = new WebSocket(OKX_WS_PUBLIC);
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: PAIRS.map(instId => ({ channel: 'tickers', instId })),
        }));
      };
      ws.onmessage = (msg) => {
        let parsed;
        try { parsed = JSON.parse(msg.data); } catch { return; }
        if (parsed.arg?.channel !== 'tickers' || !parsed.data) return;
        const t = parsed.data[0];
        const last = +t.last;
        const open24 = +t.open24h || last;
        setPrices(prev => ({
          ...prev,
          [parsed.arg.instId]: {
            price: last,
            prev: prev[parsed.arg.instId]?.price ?? last,
            change: open24 ? ((last - open24) / open24) * 100 : 0,
          },
        }));
      };
      ws.onclose = () => { if (!closed) reconnect = setTimeout(connect, 2000); };
      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    };
    connect();

    return () => {
      closed = true;
      if (reconnect) clearTimeout(reconnect);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto">
      {PAIRS.map(pair => {
        const sym = pair.split('-')[0];
        const d = prices[pair];
        const up = (d?.change ?? 0) >= 0;
        const flashUp = d && d.price > d.prev;
        const flashDown = d && d.price < d.prev;
        return (
          <div key={pair} className="rounded-xl p-4 text-left transition-all duration-200 hover:scale-105"
               style={{ background: 'rgba(30,35,41,0.6)', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{sym}</span>
              <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: up ? '#03A66D' : '#CF304A' }}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {up ? '+' : ''}{(d?.change ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="text-lg font-black font-mono" style={{ color: flashUp ? '#03A66D' : flashDown ? '#CF304A' : '#EAECEF', transition: 'color 0.2s ease' }}>
              {d ? `$${d.price.toLocaleString(undefined, { maximumFractionDigits: d.price < 10 ? 4 : 2 })}` : '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{sym}/USDT · Live</div>
          </div>
        );
      })}
    </div>
  );
}
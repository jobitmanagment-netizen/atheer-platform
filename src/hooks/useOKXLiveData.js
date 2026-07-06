import { useState, useEffect, useRef } from 'react';

/**
 * Live market data from OKX public WebSocket (no API keys needed — public channels).
 * Subscribes to: tickers (live price + 24h stats), books (live order book), trades (live trade feed).
 * Auto-reconnects on disconnect and resubscribes when the instrument changes.
 */
const OKX_WS_PUBLIC = 'wss://ws.okx.com:8443/ws/v5/public';

export function useOKXLiveData(instId) {
  const [connected, setConnected] = useState(false);
  const [ticker, setTicker] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [], maxTotal: 1, buyRatio: 50 });
  const [trades, setTrades] = useState([]);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const instRef = useRef(instId);

  useEffect(() => {
    instRef.current = instId;
    let closedByUs = false;

    const buildBook = (bids, asks) => {
      const parsedBids = bids.slice(0, 14).map(([price, amount]) => ({ price: +price, amount: +amount, total: 0 }));
      const parsedAsks = asks.slice(0, 14).map(([price, amount]) => ({ price: +price, amount: +amount, total: 0 }));
      let bt = 0; parsedBids.forEach(b => { bt += b.amount; b.total = bt; });
      let at = 0; parsedAsks.forEach(a => { at += a.amount; a.total = at; });
      // Buy/sell pressure ratio across the visible book
      const buyRatio = (bt + at) > 0 ? (bt / (bt + at)) * 100 : 50;
      return { bids: parsedBids, asks: parsedAsks, maxTotal: Math.max(bt, at, 1), buyRatio };
    };

    const connect = () => {
      const ws = new WebSocket(OKX_WS_PUBLIC);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { channel: 'tickers', instId },
            { channel: 'books5', instId },
            { channel: 'trades', instId },
          ],
        }));
      };

      ws.onmessage = (msg) => {
        let parsed;
        try { parsed = JSON.parse(msg.data); } catch { return; }
        if (!parsed.arg || !parsed.data) return;
        const ch = parsed.arg.channel;

        if (ch === 'tickers') {
          const t = parsed.data[0];
          const last = +t.last;
          const open24 = +t.open24h || last;
          setTicker(prev => ({
            price: last,
            prevPrice: prev?.price ?? last,
            change_percent: open24 ? ((last - open24) / open24) * 100 : 0,
            high: +t.high24h,
            low: +t.low24h,
            volume: +t.volCcy24h,
          }));
        } else if (ch === 'books5') {
          const b = parsed.data[0];
          setOrderBook(buildBook(b.bids || [], b.asks || []));
        } else if (ch === 'trades') {
          const incoming = parsed.data.map(d => ({
            price: +d.px,
            amount: (+d.sz).toFixed(4),
            side: d.side,
            time: new Date(+d.ts),
          }));
          setTrades(prev => [...incoming, ...prev].slice(0, 20));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closedByUs) reconnectRef.current = setTimeout(connect, 2000);
      };
      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    };

    setTicker(null);
    setOrderBook({ bids: [], asks: [], maxTotal: 1, buyRatio: 50 });
    setTrades([]);
    connect();

    return () => {
      closedByUs = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, [instId]);

  return { connected, ticker, orderBook, trades };
}
import { useState, useEffect, useRef } from 'react';
import { ccs } from '@/api/ccsClient';

const TICKER_TOKENS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TRX', 'ADA', 'DOGE', 'AVAX', 'LINK', 'MATIC'];

function fmtPrice(p) {
  if (!p) return '—';
  return p < 1 ? p.toFixed(5) : p.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Compact, Binance-style scrolling live ticker bar.
export default function LiveTickerBar() {
  const [data, setData] = useState({ prices: {}, changes: {} });
  const prevPrices = useRef({});
  const [flash, setFlash] = useState({});

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const res = await ccs.functions.invoke('getLiveMarketData', { type: 'all' });
        const d = res?.data || res;
        if (!mounted || !d?.prices) return;
        // detect direction for flash
        const f = {};
        Object.entries(d.prices).forEach(([k, v]) => {
          const prev = prevPrices.current[k];
          if (prev != null && v !== prev) f[k] = v > prev ? 'up' : 'down';
        });
        prevPrices.current = d.prices;
        setData({ prices: d.prices, changes: d.changes || {} });
        if (Object.keys(f).length) {
          setFlash(f);
          setTimeout(() => mounted && setFlash({}), 600);
        }
      } catch (e) { /* keep previous */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const items = TICKER_TOKENS.map(sym => ({
    sym,
    price: data.prices[sym] || 0,
    change: data.changes[sym] || 0,
    flash: flash[sym],
  }));

  // duplicate for seamless scroll
  const loop = [...items, ...items];

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ background: '#0D1117', border: '1px solid #1E2329' }}>
      <div className="flex items-center">
        <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-1.5 z-10"
             style={{ background: '#0D1117', borderRight: '1px solid #1E2329' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#03A66D' }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: '#F0B90B', fontSize: 10 }}>MARKETS</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex items-center gap-6 animate-ticker whitespace-nowrap py-2.5 px-4">
            {loop.map((t, i) => {
              const up = t.change >= 0;
              const flashColor = t.flash === 'up' ? '#03A66D' : t.flash === 'down' ? '#CF304A' : '#EAECEF';
              return (
                <div key={`${t.sym}-${i}`} className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: '#848E9C' }}>{t.sym}</span>
                  <span className="text-xs font-bold font-mono transition-colors duration-300" style={{ color: flashColor }}>
                    ${fmtPrice(t.price)}
                  </span>
                  <span className="text-xs font-bold font-mono" style={{ color: up ? '#03A66D' : '#CF304A', fontSize: 10 }}>
                    {up ? '+' : ''}{t.change.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
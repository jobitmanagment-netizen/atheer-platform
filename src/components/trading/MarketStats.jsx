import { useState, useEffect, useRef } from 'react';

export default function MarketStats({ livePrice, stats }) {
  const change = stats?.change_percent || 0;
  const isUp = change >= 0;
  const [flash, setFlash] = useState(null);
  const prevRef = useRef(livePrice);

  useEffect(() => {
    if (livePrice && prevRef.current && livePrice !== prevRef.current) {
      setFlash(livePrice > prevRef.current ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 350);
      prevRef.current = livePrice;
      return () => clearTimeout(t);
    }
    prevRef.current = livePrice;
  }, [livePrice]);

  const items = [
    { label: '24h Change', value: `${isUp ? '+' : ''}${change.toFixed(2)}%`, color: isUp ? '#03A66D' : '#CF304A' },
    { label: '24h High', value: `$${(stats?.high || livePrice * 1.02).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: '#EAECEF' },
    { label: '24h Low', value: `$${(stats?.low || livePrice * 0.98).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: '#EAECEF' },
    { label: '24h Vol', value: `${(stats?.volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${stats?.symbol || ''}`, color: '#848E9C' },
  ];

  const priceColor = flash === 'up' ? '#03A66D' : flash === 'down' ? '#CF304A' : '#EAECEF';

  return (
    <div className="flex items-center gap-6 px-4 py-2.5 rounded-xl overflow-x-auto" style={{ background: '#151A1F', border: '1px solid #1E2329' }}>
      <span className="text-2xl font-black font-mono flex-shrink-0" style={{ color: priceColor, transition: 'color 0.15s ease' }}>
        ${livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      {items.map(s => (
        <div key={s.label} className="flex-shrink-0 whitespace-nowrap">
          <span className="text-xs" style={{ color: '#4B5563' }}>{s.label} </span>
          <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
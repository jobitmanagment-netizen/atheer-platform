import { Activity } from 'lucide-react';

export default function TradeFeed({ trades }) {
  const fmt = (v) => v < 1 ? v.toFixed(4) : v.toFixed(2);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #2B3139' }}>
        <Activity className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
        <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Recent Trades</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-xs font-semibold" style={{ color: '#4B5563', borderBottom: '1px solid #1E2329' }}>
        <span>Price</span><span className="text-right">Amount</span><span className="text-right">Time</span>
      </div>
      <div className="max-h-[340px] overflow-y-auto">
        {trades.map((t, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-1 text-xs" style={{ borderBottom: '1px solid #151A1F' }}>
            <span className="font-mono" style={{ color: t.side === 'buy' ? '#03A66D' : '#CF304A' }}>{fmt(t.price)}</span>
            <span className="text-right font-mono" style={{ color: '#848E9C' }}>{t.amount}</span>
            <span className="text-right" style={{ color: '#4B5563' }}>{t.time.toLocaleTimeString('en', { hour12: false, minute: '2-digit', second: '2-digit' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
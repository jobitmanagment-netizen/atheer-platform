import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

export default function WhaleFeed({ whales }) {
  if (!whales || whales.length === 0) {
    return <div className="text-center py-8 text-sm" style={{ color: '#848E9C' }}>No whale activity detected</div>;
  }

  const getIcon = (type) => {
    if (type === 'BUY') return <ArrowDownLeft className="w-3.5 h-3.5" />;
    if (type === 'SELL') return <ArrowUpRight className="w-3.5 h-3.5" />;
    return <ArrowLeftRight className="w-3.5 h-3.5" />;
  };

  const getColor = (type) => {
    if (type === 'BUY') return '#03A66D';
    if (type === 'SELL') return '#CF304A';
    return '#F0B90B';
  };

  return (
    <div className="space-y-2">
      {whales.map((w, i) => {
        const color = getColor(w.type);
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
               style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: `${color}18`, color }}>
              {getIcon(w.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{w.token}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}18`, color }}>{w.type}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>{w.significance}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-black" style={{ color }}>
                {w.type === 'BUY' ? '+' : w.type === 'SELL' ? '-' : ''}${(w.amount_usd / 1000000).toFixed(2)}M
              </div>
              <div className="text-xs" style={{ color: '#4B5563' }}>{w.venue}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
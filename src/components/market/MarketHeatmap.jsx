export default function MarketHeatmap({ tokens }) {
  if (!tokens || tokens.length === 0) {
    return <div className="text-center py-8 text-sm" style={{ color: '#848E9C' }}>No heatmap data</div>;
  }

  const getColor = (change) => {
    if (change >= 5) return 'rgba(3,166,109,0.8)';
    if (change >= 2) return 'rgba(3,166,109,0.5)';
    if (change >= 0) return 'rgba(3,166,109,0.25)';
    if (change >= -2) return 'rgba(207,48,74,0.25)';
    if (change >= -5) return 'rgba(207,48,74,0.5)';
    return 'rgba(207,48,74,0.8)';
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
      {tokens.map(t => (
        <div key={t.symbol}
             className="rounded-lg p-2.5 transition-all hover:scale-105 cursor-pointer"
             style={{ background: getColor(t.change_pct), border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-xs font-bold text-white truncate">{t.symbol}</div>
          <div className="text-[10px] text-white/70 mt-0.5">
            ${t.price < 1 ? t.price.toFixed(5) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-black text-white mt-1">{t.change_pct >= 0 ? '+' : ''}{t.change_pct.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}
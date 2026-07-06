export default function TierCard({ tier, totalVolume, cashback }) {
  const TIERS = {
    bronze:   { name: 'Bronze',   min: 0,       next: 10000,   cashback: 0.05, color: '#CD7F32' },
    silver:   { name: 'Silver',   min: 10000,   next: 50000,   cashback: 0.10, color: '#C0C0C0' },
    gold:     { name: 'Gold',     min: 50000,   next: 250000,  cashback: 0.15, color: '#F0B90B' },
    platinum: { name: 'Platinum', min: 250000,  next: 1000000, cashback: 0.25, color: '#E5E4E2' },
    diamond:  { name: 'Diamond',  min: 1000000, next: null,    cashback: 0.40, color: '#B9F2FF' },
  };

  const t = TIERS[tier] || TIERS.bronze;
  const progress = t.next ? Math.min((totalVolume / t.next) * 100, 100) : 100;
  const remaining = t.next ? Math.max(t.next - totalVolume, 0) : 0;

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden"
         style={{ background: `linear-gradient(135deg, ${t.color}10 0%, #1a1f26 60%, #0f1419 100%)`, border: `1px solid ${t.color}33` }}>
      <div className="absolute right-4 top-4 opacity-5">
        <span className="text-6xl font-black" style={{ color: t.color }}>{t.name[0]}</span>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#848E9C' }}>VIP Tier</span>
        </div>
        <h2 className="text-2xl font-black" style={{ color: t.color }}>{t.name} Member</h2>
        <p className="text-xs mt-1" style={{ color: '#848E9C' }}>
          {t.next ? `${formatUSD(remaining)} to ${getNextTierName(tier)}` : 'Maximum tier reached'}
        </p>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: '#848E9C' }}>{formatUSD(totalVolume)} traded</span>
            <span style={{ color: '#848E9C' }}>{t.next ? formatUSD(t.next) : '∞'}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0B0E11' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}88)` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-xs" style={{ color: '#848E9C' }}>Cashback Rate</p>
            <p className="text-lg font-black" style={{ color: t.color }}>{(t.cashback * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-xs" style={{ color: '#848E9C' }}>Total Earned</p>
            <p className="text-lg font-black" style={{ color: '#03A66D' }}>${(cashback || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatUSD(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function getNextTierName(tier) {
  const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const idx = order.indexOf(tier);
  const next = order[idx + 1];
  return next ? next.charAt(0).toUpperCase() + next.slice(1) : 'Max';
}
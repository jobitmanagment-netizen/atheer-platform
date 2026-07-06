import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, subtitle, change, icon: Icon, iconColor, accentColor, glass = false }) {
  const isPositive = change >= 0;

  return (
    <div
      className={`rounded-xl p-5 transition-all duration-200 hover:scale-[1.01] cursor-default ${glass ? 'atheer-glass' : 'atheer-card'}`}
      style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: '#848E9C' }}>{title}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${iconColor || '#F0B90B'}18` }}>
            <Icon className="w-4 h-4" style={{ color: iconColor || '#F0B90B' }} />
          </div>
        )}
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold" style={{ color: '#EAECEF', fontFamily: 'Inter, monospace' }}>{value}</span>
      </div>
      <div className="flex items-center gap-2">
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-atheer-green' : 'text-atheer-red'}`}
                style={{ color: isPositive ? '#03A66D' : '#CF304A' }}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
        {subtitle && <span className="text-xs" style={{ color: '#848E9C' }}>{subtitle}</span>}
      </div>
    </div>
  );
}
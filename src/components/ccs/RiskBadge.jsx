import { RISK_COLORS } from '@/lib/ccs-constants';

export default function RiskBadge({ level, score, showScore = false, size = 'sm' }) {
  if (!level) return null;
  const colors = RISK_COLORS[level] || RISK_COLORS.SAFE;
  const isCritical = level === 'CRITICAL';

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md ${sizeClasses[size]} ${isCritical ? 'animate-pulse-critical' : ''}`}
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}33` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.text }} />
      {level}
      {showScore && score !== undefined && (
        <span className="opacity-75 font-normal">({score})</span>
      )}
    </span>
  );
}
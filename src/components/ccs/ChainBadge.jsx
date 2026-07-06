import { CHAIN_COLORS, CHAIN_LABELS } from '@/lib/ccs-constants';

export default function ChainBadge({ chain, size = 'sm' }) {
  if (!chain) return null;
  const color = CHAIN_COLORS[chain] || '#848E9C';
  const label = CHAIN_LABELS[chain] || chain;

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
  };

  const isTRON = chain === 'TRON';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md ${sizeClasses[size]}`}
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {chain}
      {isTRON && (
        <span className="text-xs font-bold ml-0.5" style={{ color: '#FF0013' }}>TRC20</span>
      )}
    </span>
  );
}
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, History } from 'lucide-react';

export default function WalletActionButtons({ onDeposit, onSend, onTransfer, onHistory, size = 'sm' }) {
  const isSm = size === 'sm';
  const actions = [
    { icon: ArrowDownLeft, label: 'Deposit',  color: '#03A66D', onClick: onDeposit },
    { icon: ArrowUpRight,  label: 'Send',     color: '#CF304A', onClick: onSend },
    { icon: ArrowLeftRight, label: 'Transfer', color: '#627EEA', onClick: onTransfer },
    { icon: History,        label: 'History',  color: '#F0B90B', onClick: onHistory },
  ];

  return (
    <div className="flex items-center gap-2">
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick}
          className={`flex items-center gap-1.5 rounded-lg font-bold transition-all hover:opacity-80 ${isSm ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
          style={{ background: `${a.color}12`, color: a.color, border: `1px solid ${a.color}22` }}>
          <a.icon className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          {a.label}
        </button>
      ))}
    </div>
  );
}
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const CURRENCY_FLAGS = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', AED: '🇦🇪', SAR: '🇸🇦',
  AUD: '🇦🇺', CAD: '🇨🇦', JPY: '🇯🇵', CHF: '🇨🇭', CNY: '🇨🇳',
};

const CURRENCY_COLORS = {
  USD: '#03A66D', EUR: '#627EEA', GBP: '#CF304A', AED: '#F0B90B', SAR: '#03A66D',
  AUD: '#627EEA', CAD: '#CF304A', JPY: '#F0B90B', CHF: '#848E9C', CNY: '#CF304A',
};

export default function FiatWalletCard({ wallet, onDeposit, onWithdraw }) {
  const color = CURRENCY_COLORS[wallet.currency] || '#F0B90B';
  const flag = CURRENCY_FLAGS[wallet.currency] || '💰';

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden"
         style={{ background: `linear-gradient(135deg, ${color}10 0%, #1E2329 100%)`, border: `1px solid ${color}33` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <div>
            <p className="text-sm font-black" style={{ color: '#EAECEF' }}>{wallet.currency}</p>
            <p className="text-[10px]" style={{ color: '#848E9C' }}>{wallet.bank_name || 'Fiat Wallet'}</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: wallet.is_verified ? 'rgba(3,166,109,0.12)' : 'rgba(132,142,156,0.1)',
                       color: wallet.is_verified ? '#03A66D' : '#848E9C' }}>
          {wallet.is_verified ? '✓ Active' : 'Pending'}
        </span>
      </div>

      <p className="text-2xl font-black mb-3" style={{ color }}>
        {wallet.balance?.toFixed(2) || '0.00'}
        <span className="text-sm ml-1" style={{ color: '#848E9C' }}>{wallet.currency}</span>
      </p>

      <div className="flex gap-2">
        <button onClick={() => onDeposit(wallet.currency)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D', border: '1px solid rgba(3,166,109,0.2)' }}>
          <ArrowDownLeft className="w-3 h-3" /> Deposit
        </button>
        <button onClick={() => onWithdraw(wallet.currency)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(207,48,74,0.12)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
          <ArrowUpRight className="w-3 h-3" /> Withdraw
        </button>
      </div>
    </div>
  );
}
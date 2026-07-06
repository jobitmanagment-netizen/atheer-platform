import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Wallet, ArrowLeftRight, TrendingUp, Shield, Settings, HelpCircle, Users } from 'lucide-react';

const QUICK_ACTIONS = [
  { path: '/swap', icon: ArrowLeftRight, label: 'Quick Swap', shortcut: 'G S' },
  { path: '/wallets', icon: Wallet, label: 'My Wallets', shortcut: 'G W' },
  { path: '/futures', icon: Zap, label: 'Futures Trading', shortcut: 'G F' },
  { path: '/pro-trading', icon: TrendingUp, label: 'Pro Trading', shortcut: 'G T' },
  { path: '/earn', icon: TrendingUp, label: 'Staking', shortcut: 'G E' },
  { path: '/trading-bots', icon: Zap, label: 'Trading Bots', shortcut: 'G B' },
  { path: '/copy-trading', icon: Users, label: 'Copy Trading', shortcut: 'G C' },
  { path: '/security', icon: Shield, label: 'Security Settings', shortcut: 'G D' },
  { path: '/settings', icon: Settings, label: 'Settings', shortcut: 'G ,' },
  { path: '/help', icon: HelpCircle, label: 'Help Center', shortcut: 'G H' },
];

export default function QuickActionsMenu({ onClose }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
          <Search className="w-5 h-5" style={{ color: '#848E9C' }} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#EAECEF' }}
          />
          <span className="text-xs px-2 py-1 rounded" style={{ background: '#0B0E11', color: '#848E9C' }}>ESC</span>
        </div>

        {/* Actions */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#3B4149' }} />
              <p className="text-sm" style={{ color: '#848E9C' }}>No results found</p>
            </div>
          ) : (
            filtered.map(action => (
              <button
                key={action.path}
                onClick={() => { navigate(action.path); onClose?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-opacity-80"
                style={{ background: 'transparent' }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.08)' }}>
                  <action.icon className="w-4 h-4" style={{ color: '#F0B90B' }} />
                </div>
                <span className="flex-1 text-left text-sm font-medium" style={{ color: '#EAECEF' }}>{action.label}</span>
                <span className="text-xs px-2 py-1 rounded" style={{ background: '#0B0E11', color: '#848E9C' }}>{action.shortcut}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
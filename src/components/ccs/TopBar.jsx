import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Command, HelpCircle, Calculator } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import QuickActionsMenu from './QuickActionsMenu';
import HelpWidget from './HelpWidget';
import RiskCalculator from '../trading/RiskCalculator';

const PAGE_TITLES = {
  '/dashboard': { title: 'Overview',    sub: 'Portfolio & Analytics'        },
  '/wallets':   { title: 'Wallets',     sub: 'Multi-Chain Asset Management' },
  '/swap':      { title: 'Trade',       sub: 'Instant Token Exchange'       },
  '/liquidity': { title: 'Earn',        sub: 'Liquidity Pools & APY'        },
  '/history':   { title: 'History',     sub: 'Transaction Records'          },
  '/profile':   { title: 'Account',     sub: 'Profile & KYC'                },
  '/admin':     { title: 'Admin Panel', sub: 'Platform Management'          },
};

export default function TopBar({ userProfile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const page = PAGE_TITLES[location.pathname] || { title: 'CCS Technology', sub: '' };
  const showBack = location.pathname !== '/dashboard';
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickActions(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setShowHelp(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        setShowCalculator(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-14 flex items-center justify-between px-5 flex-shrink-0 safe-top"
         style={{ background: '#0B0E11', borderBottom: '1px solid #1E2329' }}>

      {/* Left: back button + breadcrumb */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80 md:hidden"
            style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold" style={{ color: '#EAECEF' }}>{page.title}</h2>
            {location.pathname === '/admin' && (
              <span className="text-xs px-2 py-0.5 rounded font-black"
                    style={{ background: 'rgba(207,48,74,0.15)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.3)' }}>
                ADMIN
              </span>
            )}
          </div>
          {page.sub && (
            <p className="text-xs" style={{ color: '#4B5563', marginTop: 1 }}>{page.sub}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <button
          onClick={() => setShowQuickActions(true)}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:opacity-80"
          style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}
        >
          <Command className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="ml-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#2B3139', color: '#848E9C' }}>⌘K</kbd>
        </button>

        {/* Risk Calculator */}
        <button
          onClick={() => setShowCalculator(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: 'rgba(240,185,11,0.08)', color: '#F0B90B' }}
        >
          <Calculator className="w-3.5 h-3.5" />
          Risk
        </button>

        {/* Help */}
        <button
          onClick={() => setShowHelp(true)}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80"
          style={{ background: 'rgba(98,126,234,0.08)', color: '#627EEA' }}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <NotificationCenter />

        {/* Avatar */}
        <Link to="/profile"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:opacity-80 group"
              style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black gold-gradient">
            {(userProfile?.full_name || 'U')[0].toUpperCase()}
          </div>
          <span className="hidden md:block text-xs font-semibold" style={{ color: '#EAECEF' }}>
            {userProfile?.full_name?.split(' ')[0] || 'Account'}
          </span>
          <ChevronDown className="hidden md:block w-3 h-3" style={{ color: '#848E9C' }} />
        </Link>
      </div>

      {/* Modals */}
      {showQuickActions && <QuickActionsMenu onClose={() => setShowQuickActions(false)} />}
      {showHelp && <HelpWidget onClose={() => setShowHelp(false)} />}
      {showCalculator && <RiskCalculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}
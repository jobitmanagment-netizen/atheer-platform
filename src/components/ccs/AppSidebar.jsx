import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, ArrowLeftRight, Droplets, History, User, Shield, LogOut, Zap, Code2, BarChart3, Lock, Bell, FileText, Brain, TrendingUp, Layers, Bot, Users, Globe, PieChart, Trophy, Building2, Settings as SettingsIcon, Info, Phone, Handshake, Sparkles, Store, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navSections = [
  {
    title: 'Trading',
    items: [
      { path: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'      },
      { path: '/wallets',       icon: Wallet,          label: 'Wallets'        },
      { path: '/banking',       icon: Building2,       label: 'Global Banking', badge: 'SWIFT', badgeColor: '#627EEA' },
      { path: '/swap',          icon: ArrowLeftRight,  label: 'Swap',          badge: 'HOT',  badgeColor: '#F0B90B' },
      { path: '/pro-trading',   icon: Layers,          label: 'Pro Trading',   badge: 'PRO',  badgeColor: '#627EEA' },
      { path: '/futures',       icon: Zap,             label: 'Futures',        badge: '125x', badgeColor: '#CF304A' },
      { path: '/ai-signals',    icon: Brain,           label: 'AI Signals',     badge: 'AI',   badgeColor: '#8247E5' },
      { path: '/market-intel',  icon: Globe,           label: 'Market Intel',   badge: 'PRO',  badgeColor: '#627EEA' },
    ],
  },
  {
    title: 'Earn & Tools',
    items: [
      { path: '/earn',          icon: Droplets,        label: 'Earn & Stake',  badge: '24% APY', badgeColor: '#03A66D' },
      { path: '/trading-bots',  icon: Bot,             label: 'Trading Bots',  badge: 'NEW',    badgeColor: '#8247E5' },
      { path: '/copy-trading',  icon: Users,           label: 'Copy Trading',  badge: 'NEW',    badgeColor: '#F0B90B' },
      { path: '/price-alerts',  icon: Bell,            label: 'Price Alerts',  badge: 'LIVE',   badgeColor: '#03A66D' },
      { path: '/portfolio-pro', icon: PieChart,        label: 'Portfolio Pro', badge: 'PRO',    badgeColor: '#627EEA' },
      { path: '/rewards',       icon: Trophy,          label: 'VIP Rewards',   badge: '20%',    badgeColor: '#F0B90B' },
      { path: '/settings',      icon: SettingsIcon,    label: 'Settings',      badge: null,     badgeColor: null },
    ],
  },
  {
    title: 'Account',
    items: [
      { path: '/history',       icon: History,         label: 'History'        },
      { path: '/profile',       icon: User,            label: 'Profile'        },
      { path: '/settings',      icon: SettingsIcon,    label: 'Settings'       },
    ],
  },
  {
    title: 'Security & AI',
    items: [
      { path: '/analytics',     icon: BarChart3,       label: 'Analytics',     badge: 'NEW',  badgeColor: '#627EEA' },
      { path: '/security',      icon: Lock,            label: 'Security',      badge: 'SEC',  badgeColor: '#CF304A' },
      { path: '/alerts',        icon: Bell,            label: 'Alerts',        badge: 'LIVE', badgeColor: '#03A66D' },
      { path: '/threat-reports',icon: FileText,        label: 'Reports',       badge: 'AI',   badgeColor: '#8247E5' },
      { path: '/ai-models',     icon: Brain,           label: 'AI Models',     badge: 'NEW',  badgeColor: '#F0B90B' },
      { path: '/risk-trends',   icon: TrendingUp,      label: 'Risk Trends',   badge: 'AI',   badgeColor: '#627EEA' },
    ],
  },
  {
    title: 'Revolutionary',
    items: [
      { path: '/p2p',           icon: Handshake,       label: 'P2P Trading',    badge: 'NEW',  badgeColor: '#03A66D' },
      { path: '/ai-assistant',  icon: Sparkles,        label: 'AI Assistant',   badge: 'AI',   badgeColor: '#8247E5' },
      { path: '/marketplace',   icon: Store,           label: 'Marketplace',    badge: 'NEW',  badgeColor: '#F0B90B' },
      { path: '/social',        icon: MessageCircle,   label: 'Social Rooms',   badge: 'BETA', badgeColor: '#627EEA' },
      { path: '/wallet-protect',icon: ShieldCheck,     label: 'Wallet Protect', badge: 'SEC',  badgeColor: '#CF304A' },
    ],
  },
];

// Flatten for backward compatibility
const navItems = navSections.flatMap(s => s.items);

const KYC_BADGE = {
  verified: { label: 'Verified',   bg: 'rgba(3,166,109,0.12)',  color: '#03A66D' },
  pending:  { label: 'Pending',    bg: 'rgba(240,185,11,0.12)', color: '#F0B90B' },
  none:     { label: 'Unverified', bg: 'rgba(132,142,156,0.1)', color: '#848E9C' },
};

export default function AppSidebar({ userProfile }) {
  const location = useLocation();
  const { logout } = useAuth();
  const isAdmin  = userProfile?.role === 'admin';

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-50"
           style={{ background: '#0B0E11', borderRight: '1px solid #1E2329' }}>

      {/* ── Logo ────────────────────────────────────── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E2329' }}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gold-gradient shadow-lg">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-gold leading-none">CCS</div>
            <div className="text-xs font-medium tracking-widest" style={{ color: '#4B5563', fontSize: 9 }}>TECHNOLOGY</div>
          </div>
        </Link>
      </div>

      {/* ── Market Ticker Strip ─────────────────────── */}
      <div className="px-4 py-2.5 space-y-1.5" style={{ borderBottom: '1px solid #1E2329', background: '#0D1117' }}>
        {[
          { sym: 'BTC/USDT', price: '103,240', change: '+1.24', up: true },
          { sym: 'ETH/USDT', price: '3,245',   change: '+2.34', up: true },
          { sym: 'BNB/USDT', price: '612',      change: '-0.87', up: false },
        ].map(t => (
          <div key={t.sym} className="flex items-center justify-between text-xs">
            <span className="font-semibold" style={{ color: '#848E9C' }}>{t.sym}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold" style={{ color: '#EAECEF' }}>{t.price}</span>
              <span className="font-semibold text-xs" style={{ color: t.up ? '#03A66D' : '#CF304A', fontSize: 10 }}>{t.change}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-bold uppercase tracking-widest px-3 py-2" style={{ color: '#3B4149', fontSize: 9 }}>{section.title}</p>
            {section.items.map(({ path, icon: Icon, label, badge, badgeColor }) => (
              <Link key={path} to={path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                    style={{
                      background: location.pathname === path ? 'rgba(240,185,11,0.08)' : 'transparent',
                      color:      location.pathname === path ? '#F0B90B' : '#5D6673',
                    }}>
                <div className="w-1 h-5 rounded-full flex-shrink-0 transition-all"
                     style={{ background: location.pathname === path ? '#F0B90B' : 'transparent' }} />
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{label}</span>
                {badge && (
                  <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${badgeColor}18`, color: badgeColor, fontSize: 9 }}>{badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}

        {isAdmin && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest px-3 py-2 mt-3" style={{ color: '#3B4149', fontSize: 9 }}>Admin</p>
            <Link to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                  style={{
                    background: location.pathname === '/admin' ? 'rgba(207,48,74,0.08)' : 'transparent',
                    color:      location.pathname === '/admin' ? '#CF304A' : '#5D6673',
                  }}>
              <div className="w-1 h-5 rounded-full flex-shrink-0"
                   style={{ background: location.pathname === '/admin' ? '#CF304A' : 'transparent' }} />
              <Shield className="w-4 h-4 flex-shrink-0" />
              Admin Panel
            </Link>
            <Link to="/code-export"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                  style={{
                    background: location.pathname === '/code-export' ? 'rgba(98,126,234,0.08)' : 'transparent',
                    color:      location.pathname === '/code-export' ? '#627EEA' : '#5D6673',
                  }}>
              <div className="w-1 h-5 rounded-full flex-shrink-0"
                   style={{ background: location.pathname === '/code-export' ? '#627EEA' : 'transparent' }} />
              <Code2 className="w-4 h-4 flex-shrink-0" />
              Code Export
            </Link>
          </>
        )}
      </nav>

      {/* ── User Card ───────────────────────────────── */}
      {userProfile && (
        <div className="mx-3 mb-2 rounded-xl p-3" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-black gold-gradient flex-shrink-0">
              {(userProfile.full_name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate" style={{ color: '#EAECEF' }}>
                {userProfile.full_name || 'Trader'}
              </div>
              <div className="text-xs px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5"
                   style={KYC_BADGE[userProfile.kyc_status || 'none']}>
                <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />
                {KYC_BADGE[userProfile.kyc_status || 'none'].label}
              </div>
            </div>
          </div>
          <button onClick={() => logout()}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'rgba(207,48,74,0.08)', color: '#CF304A' }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
      {/* Footer Links */}
      <div className="px-3 pb-3 space-y-1.5">
        <Link to="/about"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: '#5D6673' }}>
          <Info className="w-3.5 h-3.5" />
          About
        </Link>
        <Link to="/contact"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: '#5D6673' }}>
          <Phone className="w-3.5 h-3.5" />
          Contact
        </Link>
      </div>
      <div className="text-center pb-2 space-y-0.5">
        <p className="text-xs font-medium" style={{ color: '#2B3139', fontSize: 8 }}>Powered by CCS Technology</p>
        <p className="text-xs font-medium" style={{ color: '#2B3139', fontSize: 8 }}>Architecture by Fatmi Alamedine</p>
      </div>
    </aside>
  );
}
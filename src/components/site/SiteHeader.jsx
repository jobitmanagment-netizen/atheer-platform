import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, LayoutDashboard, LogIn } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/services', key: 'nav.services' },
  { to: '/projects', key: 'nav.projects' },
  { to: '/downloads', key: 'nav.downloads' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
];

export default function SiteHeader() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-gold' : 'hover:text-gold'}`;

  return (
    <header
      className="sticky top-0 z-50 transition-colors"
      style={{
        background: scrolled ? 'rgba(11,14,17,0.92)' : 'rgba(11,14,17,0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scrolled ? '#2B3139' : 'transparent'}`,
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center gold-gradient">
            <span className="text-black font-black text-lg">C</span>
          </div>
          <div className="leading-none">
            <div className="font-black text-base" style={{ color: '#EAECEF' }}>CCS</div>
            <div className="text-[10px] font-semibold tracking-wide" style={{ color: '#848E9C' }}>TECHNOLOGY</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-7" style={{ color: '#EAECEF' }}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
              {t(item.key)}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Link
            to={isAuthenticated ? '/dashboard/client' : '/login'}
            className="w-9 h-9 rounded-lg hidden sm:flex items-center justify-center"
            style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}
            aria-label={isAuthenticated ? t('dash.clientTitle') : t('nav.launchApp')}
            title={isAuthenticated ? t('dash.clientTitle') : t('nav.launchApp')}
          >
            {isAuthenticated ? <LayoutDashboard className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </Link>
          <Link
            to="/atheer"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient"
          >
            {t('nav.launchApp')}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" style={{ color: '#EAECEF' }} /> : <Menu className="w-5 h-5" style={{ color: '#EAECEF' }} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t" style={{ borderColor: '#2B3139', background: 'rgba(11,14,17,0.98)' }}>
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'text-gold' : 'text-[#EAECEF]'}`
                }
                style={({ isActive }) => (isActive ? { background: 'rgba(240,185,11,0.08)' } : undefined)}
              >
                {t(item.key)}
              </NavLink>
            ))}
            <Link
              to={isAuthenticated ? '/dashboard/client' : '/login'}
              className="px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ color: '#EAECEF' }}
            >
              {isAuthenticated ? <LayoutDashboard className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isAuthenticated ? t('dash.clientTitle') : t('nav.launchApp')}
            </Link>
            <Link
              to="/atheer"
              className="mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient"
            >
              {t('nav.launchApp')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

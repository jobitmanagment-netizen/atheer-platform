import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ccs } from '@/api/ccsClient';
import { setGlobalNavigate } from '@/lib/navigation';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));

// Pages
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Wallets = lazy(() => import('./pages/Wallets'));
const Swap = lazy(() => import('./pages/Swap'));
const Liquidity = lazy(() => import('./pages/Liquidity'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const CodeExport = lazy(() => import('./pages/CodeExport'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const ThreatReports = lazy(() => import('./pages/ThreatReports'));
const SecurityAlerts = lazy(() => import('./pages/SecurityAlerts'));
const AIModelsHub = lazy(() => import('./pages/AIModelsHub'));
const RiskTrends = lazy(() => import('./pages/RiskTrends'));
const Futures = lazy(() => import('./pages/Futures'));
const ProTrading = lazy(() => import('./pages/ProTrading'));
const Earn = lazy(() => import('./pages/Earn'));
const TradingBots = lazy(() => import('./pages/TradingBots'));
const PriceAlerts = lazy(() => import('./pages/PriceAlerts'));
const CopyTrading = lazy(() => import('./pages/CopyTrading'));
const AITradingSignals = lazy(() => import('./pages/AITradingSignals'));
const MarketIntel = lazy(() => import('./pages/MarketIntel'));
const Rewards = lazy(() => import('./pages/Rewards'));
const PortfolioPro = lazy(() => import('./pages/PortfolioPro'));
const FiatBanking = lazy(() => import('./pages/FiatBanking'));
const P2P = lazy(() => import('./pages/P2P'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const SocialRooms = lazy(() => import('./pages/SocialRooms'));
const WalletProtect = lazy(() => import('./pages/WalletProtect'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Corporate site (CCS Technology)
const SiteLayout = lazy(() => import('@/components/site/SiteLayout'));
const SiteHome = lazy(() => import('./pages/site/Home'));
const SiteServices = lazy(() => import('./pages/site/Services'));
const SiteProjects = lazy(() => import('./pages/site/Projects'));
const SiteProjectDetail = lazy(() => import('./pages/site/ProjectDetail'));
const SiteDownloads = lazy(() => import('./pages/site/Downloads'));
const SiteBlog = lazy(() => import('./pages/site/Blog'));
const SiteBlogPost = lazy(() => import('./pages/site/BlogPost'));
const SiteAbout = lazy(() => import('./pages/site/About'));
const SiteContact = lazy(() => import('./pages/site/Contact'));
const ClientDashboard = lazy(() => import('./pages/dashboard/ClientDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));
const SupportTickets = lazy(() => import('./pages/support/SupportTickets'));
const ContentManager = lazy(() => import('./pages/admin/ContentManager'));

// Layout
import AppLayout from '@/components/ccs/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequireAdmin from '@/components/site/RequireAdmin';

function AppWithProfile() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const navigate = useNavigate();

  // Initialize global navigation for auth layer and error handlers
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  // Load user profile
  useEffect(() => {
    let cancelled = false;

    const initProfile = async () => {
      if (!user) {
        if (!cancelled) { setUserProfile(null); setProfileLoaded(true); }
        return;
      }

      const fallback = {
        user_id: user.uid,
        full_name: user.displayName || (user.email ? user.email.split('@')[0] : 'Trader'),
        email: user.email || '',
        kyc_status: 'none',
        role: 'user',
        total_volume_usd: 0,
        swaps_count: 0,
        ai_risk_score_avg: 0,
      };

      try {
        const profiles = await ccs.entities.UserProfile.filter({ user_id: user.uid });
        if (cancelled) return;

        if (profiles && profiles.length > 0) {
          setUserProfile({ ...fallback, ...profiles[0] });
        } else {
          try {
            const created = await ccs.entities.UserProfile.create({
              ...fallback,
              joined_at: new Date().toISOString(),
            });
            if (!cancelled) setUserProfile({ ...fallback, ...created });
          } catch {
            if (!cancelled) setUserProfile(fallback);
          }
        }
      } catch (e) {
        console.error('Profile init error:', e);
        if (!cancelled) setUserProfile(fallback);
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    };

    setProfileLoaded(false);
    initProfile();
    return () => { cancelled = true; };
  }, [user]);

  // The trading app shell needs the loaded profile; the corporate site and auth
  // pages do not, so only the protected branch waits on it.
  const appShell = profileLoaded ? (
    <AppLayout userProfile={userProfile} />
  ) : (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0B0E11' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center gold-gradient">
          <span className="text-black text-lg font-black">A</span>
        </div>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#2B3139', borderTopColor: '#F0B90B' }} />
      </div>
    </div>
  );

  return (
    <Suspense
      fallback={(
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0B0E11' }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#2B3139', borderTopColor: '#F0B90B' }} />
        </div>
      )}
    >
      <Routes>
      {/* Corporate site — CCS Technology (public, marketing chrome) */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<SiteHome />} />
        <Route path="/services" element={<SiteServices />} />
        <Route path="/projects" element={<SiteProjects />} />
        <Route path="/projects/:id" element={<SiteProjectDetail />} />
        <Route path="/downloads" element={<SiteDownloads />} />
        <Route path="/blog" element={<SiteBlog />} />
        <Route path="/blog/:slug" element={<SiteBlogPost />} />
        <Route path="/about" element={<SiteAbout />} />
        <Route path="/contact" element={<SiteContact />} />

        {/* Authenticated corporate area — keeps the site chrome (header/footer) */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/dashboard/client" element={<ClientDashboard />} />
          <Route path="/support" element={<SupportTickets />} />
          {/* Admin/manager only */}
          <Route element={<RequireAdmin />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/content" element={<ContentManager />} />
          </Route>
        </Route>
      </Route>

      {/* Atheer product landing + auth (public, no site chrome) */}
      <Route path="/atheer" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Atheer app — protected routes with sidebar layout */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
      <Route element={appShell}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/liquidity" element={<Liquidity />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/security" element={<SecurityCenter />} />
        <Route path="/threat-reports" element={<ThreatReports />} />
        <Route path="/alerts" element={<SecurityAlerts />} />
        <Route path="/ai-models" element={<AIModelsHub />} />
        <Route path="/risk-trends" element={<RiskTrends />} />
        <Route path="/futures" element={<Futures />} />
        <Route path="/pro-trading" element={<ProTrading />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/trading-bots" element={<TradingBots />} />
        <Route path="/price-alerts" element={<PriceAlerts />} />
        <Route path="/copy-trading" element={<CopyTrading />} />
        <Route path="/ai-signals" element={<AITradingSignals />} />
        <Route path="/market-intel" element={<MarketIntel />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/portfolio-pro" element={<PortfolioPro />} />
        <Route path="/banking" element={<FiatBanking />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/code-export" element={<CodeExport />} />
        <Route path="/p2p" element={<P2P />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/social" element={<SocialRooms />} />
        <Route path="/wallet-protect" element={<WalletProtect />} />
      </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0B0E11' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#2B3139', borderTopColor: '#F0B90B' }} />
      </div>
    );
  }

  return <AppWithProfile />;
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
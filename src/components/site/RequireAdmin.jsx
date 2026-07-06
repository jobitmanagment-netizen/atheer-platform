// Route guard for admin/manager-only pages. Assumes an authenticated user
// (nest it inside <ProtectedRoute>); renders the child route when the user has
// admin privileges, otherwise shows an access-denied panel.
import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isAdmin } from '@/lib/crm';

export default function RequireAdmin() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (isAdmin(user)) return <Outlet />;

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(207,48,74,0.12)' }}>
        <ShieldAlert className="w-8 h-8" style={{ color: '#CF304A' }} />
      </div>
      <p className="text-lg font-bold mb-4" style={{ color: '#EAECEF' }}>{t('admin.denied')}</p>
      <Link to="/" className="text-sm font-bold text-gold">{t('admin.denedHome')}</Link>
    </div>
  );
}

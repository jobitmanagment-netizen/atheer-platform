import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0B0E11' }}>
    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#2B3139', borderTopColor: '#F0B90B' }} />
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return fallback;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}

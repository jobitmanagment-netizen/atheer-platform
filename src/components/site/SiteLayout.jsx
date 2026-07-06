import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0E11' }}>
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import PriceTicker from './PriceTicker';
import AnnouncementBanner from './AnnouncementBanner';

export default function AppLayout({ userProfile }) {
  return (
    <div className="flex h-screen overflow-hidden safe-top" style={{ background: '#0B0E11' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar userProfile={userProfile} />
      </div>

      {/* Main content area */}
      <div className="flex-1 md:ml-[220px] flex flex-col overflow-hidden">
        <AnnouncementBanner />
        <PriceTicker />
        <TopBar userProfile={userProfile} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet context={{ userProfile }} />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
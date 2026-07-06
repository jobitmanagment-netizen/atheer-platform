import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, History, Lock, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Home'     },
  { path: '/swap',       icon: ArrowLeftRight,  label: 'Swap'     },
  { path: '/analytics',  icon: BarChart3,       label: 'Stats'    },
  { path: '/security',   icon: Lock,            label: 'Security' },
  { path: '/history',    icon: History,         label: 'History'  },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom"
         style={{ background: '#151A1F', borderTop: '1px solid #2B3139' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link key={path} to={path}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
                  style={{ color: isActive ? '#F0B90B' : '#848E9C' }}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
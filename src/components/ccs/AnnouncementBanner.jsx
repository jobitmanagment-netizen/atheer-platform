import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

const ANNOUNCEMENTS = [
  {
    id: 1,
    type: 'new',
    title: 'Trading Bots Now Live!',
    description: 'Automate your trading with grid, DCA, and martingale strategies. Get 50% off fees for the first month.',
    color: '#8247E5',
    link: '/trading-bots',
  },
  {
    id: 2,
    type: 'feature',
    title: 'Copy Trading Launched',
    description: 'Follow top traders and automatically copy their positions. Start with as little as $100.',
    color: '#03A66D',
    link: '/copy-trading',
  },
  {
    id: 3,
    type: 'security',
    title: 'Enhanced Security Update',
    description: '2FA is now mandatory for withdrawals over $10,000. Enable it in your security settings.',
    color: '#CF304A',
    link: '/settings',
  },
];

export default function AnnouncementBanner() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    return JSON.parse(localStorage.getItem('atheer_dismissed_announcements') || '[]');
  });

  useEffect(() => {
    const notDismissed = ANNOUNCEMENTS.filter(a => !dismissed.includes(a.id));
    if (notDismissed.length > 0) {
      setCurrentAnnouncement(notDismissed[0]);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    if (!currentAnnouncement) return;
    const newDismissed = [...dismissed, currentAnnouncement.id];
    localStorage.setItem('atheer_dismissed_announcements', JSON.stringify(newDismissed));
    setDismissed(newDismissed);
    setCurrentAnnouncement(null);
  };

  if (!currentAnnouncement) return null;

  return (
    <div
      className="w-full py-3 px-4 flex items-center justify-between gap-4"
      style={{
        background: `${currentAnnouncement.color}08`,
        borderBottom: `1px solid ${currentAnnouncement.color}22`,
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: currentAnnouncement.color }}
        />
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: currentAnnouncement.color }}>
            {currentAnnouncement.type.toUpperCase()}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-semibold" style={{ color: '#EAECEF' }}>
              {currentAnnouncement.title}
            </span>
            <span className="text-xs" style={{ color: '#848E9C' }}>
              {currentAnnouncement.description}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={currentAnnouncement.link}
          className="flex items-center gap-1.5 text-xs font-bold transition-all hover:opacity-80"
          style={{ color: currentAnnouncement.color }}
        >
          Learn More
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg transition-all hover:opacity-80"
          style={{ background: 'rgba(132,142,156,0.1)' }}
        >
          <X className="w-4 h-4" style={{ color: '#848E9C' }} />
        </button>
      </div>
    </div>
  );
}
import { Award, Zap, Shield, TrendingUp, Target, Flame, Crown, Star, Rocket, Trophy } from 'lucide-react';

const ACHIEVEMENTS = [
  { id: 'first_trade', name: 'First Steps', desc: 'Complete your first swap', icon: Rocket, color: '#627EEA' },
  { id: 'ten_trades', name: 'Getting Started', desc: 'Complete 10 swaps', icon: Star, color: '#F0B90B' },
  { id: 'fifty_trades', name: 'Active Trader', desc: 'Complete 50 swaps', icon: Flame, color: '#CF304A' },
  { id: 'volume_10k', name: '10K Club', desc: 'Trade $10,000+ total', icon: Target, color: '#03A66D' },
  { id: 'volume_100k', name: '100K Club', desc: 'Trade $100,000+ total', icon: Award, color: '#F0B90B' },
  { id: 'volume_1m', name: 'Millionaire', desc: 'Trade $1,000,000+ total', icon: Crown, color: '#B9F2FF' },
  { id: 'kyc_verified', name: 'Verified', desc: 'Complete KYC verification', icon: Shield, color: '#03A66D' },
  { id: 'first_stake', name: 'Earner', desc: 'Start your first staking position', icon: TrendingUp, color: '#8247E5' },
  { id: 'bot_master', name: 'Bot Master', desc: 'Run a trading bot for 24h', icon: Zap, color: '#F0B90B' },
  { id: 'top_10', name: 'Top 10', desc: 'Reach top 10 on leaderboard', icon: Trophy, color: '#F0B90B' },
];

export default function AchievementGrid({ unlocked = [] }) {
  // `unlocked` may arrive as an array or as a JSON string (it is stored as a
  // JSON string on the reward record), so handle both — string first.
  const unlockedIds = (() => {
    if (Array.isArray(unlocked)) return unlocked;
    if (typeof unlocked === 'string') {
      try {
        const parsed = JSON.parse(unlocked);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {ACHIEVEMENTS.map(a => {
        const isUnlocked = unlockedIds.includes(a.id);
        return (
          <div key={a.id}
               className="rounded-xl p-3 text-center transition-all hover:scale-105"
               style={{
                 background: isUnlocked ? `${a.color}12` : '#151A1F',
                 border: `1px solid ${isUnlocked ? a.color + '33' : '#2B3139'}`,
                 opacity: isUnlocked ? 1 : 0.4,
               }}>
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2"
                 style={{ background: isUnlocked ? `${a.color}20` : '#2B3139' }}>
              <a.icon className="w-5 h-5" style={{ color: isUnlocked ? a.color : '#4B5563' }} />
            </div>
            <p className="text-xs font-bold" style={{ color: isUnlocked ? '#EAECEF' : '#848E9C' }}>{a.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#4B5563' }}>{a.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
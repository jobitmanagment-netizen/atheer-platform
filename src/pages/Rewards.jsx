import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Crown, Gift, Trophy, TrendingUp, Medal } from 'lucide-react';
import TierCard from '@/components/rewards/TierCard';
import ReferralCard from '@/components/rewards/ReferralCard';
import AchievementGrid from '@/components/rewards/AchievementGrid';

const TIER_BENEFITS = [
  { tier: 'Bronze',   cashback: '5%',  fee_discount: '0%',  support: 'Standard',  exclusive: false, color: '#CD7F32' },
  { tier: 'Silver',   cashback: '10%', fee_discount: '10%', support: 'Priority',  exclusive: false, color: '#C0C0C0' },
  { tier: 'Gold',     cashback: '15%', fee_discount: '20%', support: 'Priority+',  exclusive: false, color: '#F0B90B' },
  { tier: 'Platinum', cashback: '25%', fee_discount: '30%', support: 'Dedicated',  exclusive: true,  color: '#E5E4E2' },
  { tier: 'Diamond',  cashback: '40%', fee_discount: '50%', support: '24/7 VIP',   exclusive: true,  color: '#B9F2FF' },
];

const TIER_COLORS = { diamond: '#B9F2FF', platinum: '#E5E4E2', gold: '#F0B90B', silver: '#C0C0C0', bronze: '#CD7F32' };

export default function Rewards() {
  const { userProfile } = useOutletContext() || {};
  const [reward, setReward] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await ccs.auth.me();
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        const [r, lb] = await Promise.all([
          ccs.request('/api/rewards'),
          ccs.request('/api/analytics/leaderboard').catch(() => ({ leaderboard: [] })),
        ]);
        if (r) setReward(r);
        if (lb?.leaderboard) setLeaderboard(lb.leaderboard);
        
        let rewards = await ccs.entities.Reward.filter({ user_id: user.id });

        if (!rewards || rewards.length === 0) {
          const referralCode = 'CCS' + user.id.slice(0, 6).toUpperCase();
          const newReward = await ccs.entities.Reward.create({
            user_id: user.id,
            tier: 'bronze',
            total_volume_usd: userProfile?.total_volume_usd || 0,
            cashback_earned_usd: 0,
            cashback_pending_usd: 0,
            referral_code: referralCode,
            referral_count: 0,
            referral_earnings_usd: 0,
            points: 0,
            achievements: '[]',
          });
          setReward(newReward);
          
          if (refCode) {
            const referrerRewards = await ccs.entities.Reward.filter({ referral_code: refCode });
            if (referrerRewards && referrerRewards.length > 0) {
              const referrer = referrerRewards[0];
              await ccs.entities.Referral.create({
                user_id: referrer.user_id,
                referred_user_id: user.id,
                referred_email: user.email,
                referral_code: refCode,
                status: 'active',
                joined_at: new Date().toISOString(),
              });
              await ccs.entities.Reward.update(referrer.id, {
                referral_count: (referrer.referral_count || 0) + 1,
              });
            }
          }
        } else {
          setReward(rewards[0]);
        }
      } catch (e) { logger.error('Rewards', 'Failed to load rewards', { error: e?.message || String(e) }); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />)}
    </div>
  );

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5" style={{ color: '#F0B90B' }} />
        <h1 className="text-xl font-black" style={{ color: '#EAECEF' }}>VIP Rewards & Referrals</h1>
      </div>

      {/* Tier Card + Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TierCard tier={reward?.tier || 'bronze'} totalVolume={reward?.total_volume_usd || 0} cashback={reward?.cashback_earned_usd} />
        <ReferralCard reward={reward} />
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
          <Trophy className="w-4 h-4" style={{ color: '#F0B90B' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Trading Leaderboard</h3>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded animate-pulse"
                style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
        </div>
        <div className="grid px-5 py-2 text-xs font-semibold uppercase tracking-wider"
             style={{ color: '#3B4149', borderBottom: '1px solid #1E2329', gridTemplateColumns: '40px 1fr 1fr 1fr 1fr' }}>
          <span>#</span><span>Trader</span><span className="text-right">Volume</span><span className="text-right">ROI</span><span className="text-right">Tier</span>
        </div>
        {(leaderboard.length > 0 ? leaderboard : []).map((t, i) => {
          const tierColor = TIER_COLORS[t.tier?.toLowerCase()] || '#627EEA';
          return (
          <div key={t.id || i} className="grid px-5 py-3 items-center text-xs hover:opacity-80"
               style={{ gridTemplateColumns: '40px 1fr 1fr 1fr 1fr', borderBottom: '1px solid #1A1F26' }}>
            <div className="flex items-center gap-1">
              {i < 3 ? (
                <Medal className="w-4 h-4" style={{ color: i === 0 ? '#F0B90B' : i === 1 ? '#C0C0C0' : '#CD7F32' }} />
              ) : (
                <span className="font-bold" style={{ color: '#4B5563' }}>{i + 1}</span>
              )}
            </div>
            <span className="font-bold" style={{ color: '#EAECEF' }}>{t.display_name || t.name || `Trader ${i + 1}`}</span>
            <span className="text-right font-bold" style={{ color: '#EAECEF' }}>${((t.total_pnl || t.volume || 0) / 1000000).toFixed(2)}M</span>
            <span className="text-right font-black" style={{ color: '#03A66D' }}>+{t.win_rate || 0}%</span>
            <span className="text-right">
              <span className="px-2 py-0.5 rounded font-bold text-xs" style={{ background: `${tierColor}18`, color: tierColor }}>
                {t.tier || 'bronze'}
              </span>
            </span>
          </div>
          );
        })}
      </div>

      {/* Achievements */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4" style={{ color: '#8247E5' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Achievements</h3>
        </div>
        <AchievementGrid unlocked={reward?.achievements || '[]'} />
      </div>

      {/* Tier Benefits Comparison */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#03A66D' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>VIP Tier Benefits</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ color: '#3B4149', borderBottom: '1px solid #1E2329', gridTemplateColumns: '1fr 80px 100px 120px 100px' }}>
              <span>Tier</span><span className="text-right">Cashback</span><span className="text-right">Fee Discount</span><span className="text-right">Support</span><span className="text-right">Exclusive</span>
            </div>
            {TIER_BENEFITS.map(b => {
              const isCurrent = reward?.tier === b.tier.toLowerCase();
              return (
                <div key={b.tier}
                     className="grid px-5 py-3 items-center text-xs transition-all"
                     style={{ gridTemplateColumns: '1fr 80px 100px 120px 100px', borderBottom: '1px solid #1A1F26',
                              background: isCurrent ? `${b.color}08` : 'transparent' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                    <span className="font-bold" style={{ color: isCurrent ? b.color : '#EAECEF' }}>{b.tier}</span>
                    {isCurrent && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${b.color}18`, color: b.color }}>YOU</span>}
                  </div>
                  <span className="text-right font-bold" style={{ color: b.color }}>{b.cashback}</span>
                  <span className="text-right font-bold" style={{ color: '#EAECEF' }}>{b.fee_discount}</span>
                  <span className="text-right" style={{ color: '#848E9C' }}>{b.support}</span>
                  <span className="text-right">{b.exclusive ? <span style={{ color: '#F0B90B' }}>✓</span> : <span style={{ color: '#4B5563' }}>—</span>}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
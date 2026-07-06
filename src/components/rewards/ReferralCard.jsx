import { useState, useEffect } from 'react';
import { Copy, Check, Users, DollarSign, TrendingUp } from 'lucide-react';
import { ccs } from '@/api/ccsClient';

export default function ReferralCard({ reward, onUpdate }) {
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    const loadReferrals = async () => {
      if (!reward?.user_id) return;
      const refs = await ccs.entities.Referral.filter({ user_id: reward.user_id });
      setReferrals(refs || []);
    };
    loadReferrals();
  }, [reward]);

  const referralCode = reward?.referral_code || 'CCS' + (reward?.user_id || '').slice(0, 6).toUpperCase();
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4" style={{ color: '#F0B90B' }} />
        <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Referral Program</h3>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }}>20% Commission</span>
      </div>

      <p className="text-xs mb-3" style={{ color: '#848E9C' }}>
        Earn 20% of trading fees from every friend you refer — forever.
      </p>

      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
        <input readOnly value={referralLink}
               className="flex-1 bg-transparent text-xs font-mono outline-none"
               style={{ color: '#EAECEF' }} />
        <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black gold-gradient transition-all hover:scale-105">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
          <Users className="w-4 h-4 mx-auto mb-1" style={{ color: '#627EEA' }} />
          <p className="text-lg font-black" style={{ color: '#EAECEF' }}>{referrals.length}</p>
          <p className="text-xs" style={{ color: '#848E9C' }}>Invited</p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
          <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#03A66D' }} />
          <p className="text-lg font-black" style={{ color: '#03A66D' }}>${(reward?.referral_earnings_usd || 0).toFixed(2)}</p>
          <p className="text-xs" style={{ color: '#848E9C' }}>Earned</p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
          <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: '#F0B90B' }} />
          <p className="text-lg font-black" style={{ color: '#F0B90B' }}>{referrals.filter(r => r.status === 'active').length}</p>
          <p className="text-xs" style={{ color: '#848E9C' }}>Active</p>
        </div>
      </div>
    </div>
  );
}
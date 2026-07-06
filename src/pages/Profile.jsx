import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Shield, CheckCircle, Clock, AlertCircle, Edit2, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { TOKEN_PRICES } from '@/lib/ccs-constants';
import { formatUSD } from '@/lib/ai-risk-engine';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';
import Web3WalletConnect from '@/components/ccs/Web3WalletConnect';
import KYCVerification from '@/components/security/KYCVerification';

const KYC_STEPS = [
  { key: 'none', label: 'Not Started', icon: AlertCircle, color: '#848E9C' },
  { key: 'pending', label: 'Under Review', icon: Clock, color: '#F0B90B' },
  { key: 'verified', label: 'Verified', icon: CheckCircle, color: '#03A66D' },
];

export default function Profile() {
  const { userProfile } = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showKYC, setShowKYC] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const isAuthed = await ccs.auth.isAuthenticated();
        if (!isAuthed) return;
        const u = await ccs.auth.me();
        if (!u) return;
        setUser(u);
        const [profiles, w, s] = await Promise.all([
          ccs.entities.UserProfile.filter({ user_id: u.id }),
          ccs.entities.Wallet.filter({ user_id: u.id }),
          ccs.entities.SwapOrder.filter({ user_id: u.id }),
        ]);
        const p = profiles?.[0];
        setProfile(p);
        setEditName(p?.full_name || u.full_name || '');
        setWallets(w || []);
        setSwaps(s || []);
      } catch (e) {
        logger.error('Profile', 'Profile load error', { error: e?.message || String(e) });
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (profile) {
      await ccs.entities.UserProfile.update(profile.id, { full_name: editName });
    }
    await ccs.auth.updateProfile({ full_name: editName });
    setProfile(p => ({ ...p, full_name: editName }));
    setEditing(false);
    setSaving(false);
  };

  const handleKYCRequest = async () => {
    if (!profile || profile.kyc_status !== 'none') return;
    await ccs.entities.UserProfile.update(profile.id, { kyc_status: 'pending' });
    setProfile(p => ({ ...p, kyc_status: 'pending' }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE' || deleting) return;
    setDeleting(true);
    try {
      if (profile) {
        await ccs.entities.UserProfile.delete(profile.id);
      }
      const userWallets = await ccs.entities.Wallet.filter({ user_id: user.id });
      for (const w of userWallets) {
        await ccs.entities.Wallet.delete(w.id);
      }
      await ccs.auth.logout('/');
    } catch (e) {
      logger.error('Profile', 'Delete error', { error: e?.message || String(e) });
    }
    setDeleting(false);
  };

  const memberDays = profile ? Math.floor((Date.now() - new Date(profile.joined_at || profile.created_date).getTime()) / 86400000) : 0;
  const totalVolume = profile?.total_volume_usd || swaps.reduce((sum, s) => sum + (s.amount_in_usd || 0), 0);
  const avgRisk = profile?.ai_risk_score_avg || Math.round(swaps.reduce((sum, s) => sum + (s.risk_score || 0), 0) / Math.max(swaps.length, 1));

  // Token balances
  const tokenBalances = wallets.reduce((acc, w) => {
    if (!acc[w.token_symbol]) acc[w.token_symbol] = { balance: 0, usd: 0 };
    acc[w.token_symbol].balance += w.balance || 0;
    acc[w.token_symbol].usd += w.balance_usd || 0;
    return acc;
  }, {});

  const kycStatus = profile?.kyc_status || 'none';
  const kycStep = KYC_STEPS.findIndex(k => k.key === kycStatus);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-xl p-6 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <svg className="w-24 h-24" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="#0B0E11" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#2B3139" strokeWidth="5" />
                <circle
                  cx="50" cy="50" r="45"
                  fill="none" stroke="#F0B90B" strokeWidth="5"
                  strokeDasharray={`${Math.min((swaps.length / 20) * 282.7, 282.7)} 282.7`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black gold-gradient text-black">
                  {((profile?.full_name || user?.full_name || 'U')[0]).toUpperCase()}
                </div>
              </div>
            </div>

            {editing ? (
              <div className="flex items-center gap-2 justify-center mb-2">
                <input value={editName} onChange={e => setEditName(e.target.value)}
                       className="text-center px-2 py-1 rounded-lg text-base font-bold outline-none"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF', maxWidth: 180 }} />
                <button onClick={handleSave} disabled={saving} style={{ color: '#03A66D' }}><Save className="w-4 h-4" /></button>
                <button onClick={() => setEditing(false)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-lg font-bold" style={{ color: '#EAECEF' }}>{profile?.full_name || user?.full_name || 'User'}</h2>
                <button onClick={() => setEditing(true)} style={{ color: '#848E9C' }}><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            )}

            <p className="text-sm mb-4" style={{ color: '#848E9C' }}>{user?.email}</p>

            <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid #2B3139' }}>
              {[
                { label: 'Swaps', value: profile?.swaps_count || swaps.length },
                { label: 'Wallets', value: wallets.length },
                { label: 'Days', value: memberDays },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-lg font-black" style={{ color: '#EAECEF' }}>{s.value}</div>
                  <div className="text-xs" style={{ color: '#848E9C' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KYC Status */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold" style={{ color: '#EAECEF' }}>KYC Status</span>
            </div>

            <div className="space-y-3 mb-4">
              {KYC_STEPS.map((step, idx) => {
                const isActive = idx === kycStep;
                const isDone = idx < kycStep;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center"
                         style={{ background: isActive || isDone ? `${step.color}18` : '#0B0E11', border: `2px solid ${isActive || isDone ? step.color : '#2B3139'}` }}>
                      <StepIcon className="w-3.5 h-3.5" style={{ color: isActive || isDone ? step.color : '#848E9C' }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: isActive ? step.color : isDone ? '#03A66D' : '#848E9C' }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {kycStatus === 'none' && (
              <button onClick={() => setShowKYC(true)}
                      className="w-full py-2 rounded-lg text-sm font-semibold transition-all text-black gold-gradient">
                Start KYC Verification
              </button>
            )}
            {kycStatus === 'pending' && (
              <button onClick={() => setShowKYC(true)}
                      className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.25)' }}>
                Re-submit KYC
              </button>
            )}
            {kycStatus === 'verified' && (
              <div className="text-xs text-center py-2" style={{ color: '#03A66D' }}>✓ Identity Verified & AML Cleared</div>
            )}
          </div>

          {showKYC && <KYCVerification userProfile={profile} onClose={() => { setShowKYC(false); window.location.reload(); }} />}

          {/* 2FA Security */}
          <TwoFactorSetup userProfile={profile} />

          {/* Web3 Wallet */}
          <Web3WalletConnect userProfile={profile} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Activity Summary */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#EAECEF' }}>Activity Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Volume', value: formatUSD(totalVolume), color: '#F0B90B' },
                { label: 'Total Swaps', value: (profile?.swaps_count || swaps.length).toString(), color: '#627EEA' },
                { label: 'Avg Risk Score', value: `${avgRisk}/100`, color: avgRisk >= 60 ? '#CF304A' : avgRisk >= 40 ? '#F0B90B' : '#03A66D' },
                { label: 'Member Since', value: `${memberDays}d`, color: '#8247E5' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                  <div className="text-xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: '#848E9C' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Token Balances */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#EAECEF' }}>Token Balances</h3>
            {Object.keys(tokenBalances).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: '#848E9C' }}>No token balances. Add a wallet to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(tokenBalances).map(([token, data]) => (
                  <div key={token} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #2B3139' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                           style={{ background: token === 'USDT-TRC20' ? 'rgba(255,0,19,0.15)' : 'rgba(240,185,11,0.15)', color: token === 'USDT-TRC20' ? '#FF0013' : '#F0B90B' }}>
                        {token[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{token}</div>
                        <div className="text-xs" style={{ color: '#848E9C' }}>{data.balance.toFixed(4)} tokens</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: token === 'USDT-TRC20' ? '#FF4444' : '#EAECEF' }}>{formatUSD(data.usd)}</div>
                      <div className="text-xs" style={{ color: '#848E9C' }}>${TOKEN_PRICES[token] || 1} / token</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone — Delete Account */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid rgba(207,48,74,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4" style={{ color: '#CF304A' }} />
              <h3 className="font-semibold" style={{ color: '#EAECEF' }}>Account Management</h3>
            </div>
            <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
              Permanently delete your account, wallets, and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.3)' }}
            >
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid rgba(207,48,74,0.3)' }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                   style={{ background: 'rgba(207,48,74,0.12)' }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#CF304A' }} />
              </div>
              <h3 className="text-lg font-black mb-1" style={{ color: '#EAECEF' }}>Delete Account?</h3>
              <p className="text-sm" style={{ color: '#848E9C' }}>
                This will permanently remove your profile, wallets, and transaction history. This action <span className="font-bold" style={{ color: '#CF304A' }}>cannot be undone</span>.
              </p>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: '#0B0E11', border: '1px solid rgba(207,48,74,0.2)' }}>
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: '#848E9C' }}>
                <span>The following will be deleted:</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {[
                  'Your profile & KYC records',
                  'All connected wallets',
                  'Swap & transaction history',
                  'Risk assessment data',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2" style={{ color: '#848E9C' }}>
                    <span style={{ color: '#CF304A' }}>•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>
                Type <span className="font-black font-mono" style={{ color: '#CF304A' }}>DELETE</span> to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #CF304A, #FF4444)' }}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
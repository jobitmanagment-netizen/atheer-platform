import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { User, Shield, Edit2, Save, X, Download, FileText, Trash2, Link2 } from 'lucide-react';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';
import KYCVerification from '@/components/security/KYCVerification';
import OKXKeysManager from '@/components/settings/OKXKeysManager';

export default function Settings() {
  const { userProfile } = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await ccs.auth.me();
      setUser(u);
      const profiles = await ccs.entities.UserProfile.filter({ user_id: u.id });
      const p = profiles?.[0];
      setProfile(p);
      setEditName(p?.full_name || u.full_name || '');
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

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const user = await ccs.auth.me();
      const [swaps, wallets, alerts] = await Promise.all([
        ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 500),
        ccs.entities.Wallet.filter({ user_id: user.id }),
        ccs.entities.ThreatAlert.filter({ status: 'active' }, '-created_date', 100),
      ]);

      let content, filename, type;

      if (format === 'csv') {
        const headers = ['Date', 'Type', 'From', 'To', 'Amount', 'USD Value', 'Fee', 'Status'];
        const rows = swaps.map(s => [
          new Date(s.created_date).toLocaleDateString(),
          'Swap',
          s.from_token,
          s.to_token,
          s.amount_in,
          s.amount_in_usd,
          s.fee_usd,
          s.status,
        ]);
        content = [headers, ...rows.map(r => r.join(','))].join('\n');
        filename = `trading-history-${Date.now()}.csv`;
        type = 'text/csv';
      } else if (format === 'pdf') {
        content = `TRADING HISTORY REPORT\nGenerated: ${new Date().toLocaleString()}\n\n`;
        content += `User: ${user.full_name} (${user.email})\n`;
        content += `Total Swaps: ${swaps.length}\n`;
        content += `Total Volume: $${swaps.reduce((s, x) => s + (x.amount_in_usd || 0), 0).toLocaleString()}\n\n`;
        content += swaps.map(s => `${new Date(s.created_date).toLocaleDateString()} - ${s.from_token} → ${s.to_token} - $${s.amount_in_usd}`).join('\n');
        filename = `trading-report-${Date.now()}.txt`;
        type = 'text/plain';
      } else {
        content = JSON.stringify({ swaps, wallets, alerts }, null, 2);
        filename = `backup-${Date.now()}.json`;
        type = 'application/json';
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error('Settings', 'Export error', { error: e?.message || String(e), format });
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This will delete all your data permanently.')) return;
    try {
      if (profile) await ccs.entities.UserProfile.delete(profile.id);
      const userWallets = await ccs.entities.Wallet.filter({ user_id: user.id });
      for (const w of userWallets) await ccs.entities.Wallet.delete(w.id);
      await ccs.auth.logout('/');
    } catch (e) {
      logger.error('Settings', 'Delete error', { error: e?.message || String(e) });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Card */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black gold-gradient text-black">
                  {(profile?.full_name || user?.full_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                             className="px-2 py-1 rounded-lg text-sm outline-none"
                             style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                      <button onClick={handleSave} disabled={saving} style={{ color: '#03A66D' }}><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditing(false)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>{profile?.full_name || user?.full_name || 'User'}</h3>
                      <p className="text-xs" style={{ color: '#848E9C' }}>{user?.email}</p>
                    </>
                  )}
                </div>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="p-2 rounded-lg transition-all"
                        style={{ background: 'rgba(240,185,11,0.08)', color: '#F0B90B' }}>
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: '#627EEA' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Security</h3>
            </div>
            <TwoFactorSetup userProfile={profile} />
          </div>

          {/* KYC Settings */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4" style={{ color: '#F0B90B' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>KYC Verification</h3>
            </div>
            {profile?.kyc_status === 'none' && (
              <button onClick={() => setShowKYC(true)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-black gold-gradient">
                Start KYC Verification
              </button>
            )}
            {profile?.kyc_status === 'pending' && (
              <button onClick={() => setShowKYC(true)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.25)' }}>
                Re-submit KYC
              </button>
            )}
            {profile?.kyc_status === 'verified' && (
              <div className="text-sm text-center py-2" style={{ color: '#03A66D' }}>✓ Identity Verified</div>
            )}
          </div>
          {showKYC && <KYCVerification userProfile={profile} onClose={() => { setShowKYC(false); window.location.reload(); }} />}

          {/* OKX Live Trading Connection */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4" style={{ color: '#03A66D' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>OKX Live Trading</h3>
            </div>
            <OKXKeysManager />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Export Data */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4" style={{ color: '#03A66D' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Export Data</h3>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleExport('csv')} disabled={exporting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                <FileText className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button onClick={() => handleExport('pdf')} disabled={exporting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                <FileText className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export Report (PDF)'}
              </button>
              <button onClick={() => handleExport('json')} disabled={exporting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                <FileText className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export JSON Backup'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid rgba(207,48,74,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4" style={{ color: '#CF304A' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Danger Zone</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: '#848E9C' }}>Permanently delete your account and all data.</p>
            <button onClick={handleDeleteAccount}
                    className="w-full py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.3)' }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
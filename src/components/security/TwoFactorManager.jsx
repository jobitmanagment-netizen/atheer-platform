import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Shield, Lock, Unlock, Loader2, KeyRound, CheckCircle, AlertTriangle, Smartphone, Copy, Check } from 'lucide-react';

export default function TwoFactorManager() {
  const [status, setStatus] = useState(null); // { enabled, has_secret }
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null); // { secret, otpauth_url, qr_code_url }
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await ccs.functions.invoke('manage2FA', { action: 'status' });
      const d = res.data || res;
      if (!d.error) setStatus(d);
    } catch (e) {
      logger.error('TwoFactorManager', '2FA status error', { error: e?.message || String(e) });
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetup = async () => {
    setActionLoading(true);
    setError(null);
    setSetupData(null);
    try {
      const res = await ccs.functions.invoke('manage2FA', { action: 'setup' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setSetupData(d);
    } catch (e) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await ccs.functions.invoke('manage2FA', { action: 'verify', code });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setSuccess('2FA enabled successfully!');
      setSetupData(null);
      setCode('');
      fetchStatus();
    } catch (e) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleDisable = async () => {
    if (!code || code.length !== 6) {
      setError('Enter your 6-digit code to disable');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await ccs.functions.invoke('manage2FA', { action: 'disable', code });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setSuccess('2FA disabled');
      setCode('');
      fetchStatus();
    } catch (e) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#627EEA' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(3,166,109,0.08)', border: '1px solid rgba(3,166,109,0.25)' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#03A66D' }} />
          <p className="text-sm font-bold" style={{ color: '#03A66D' }}>{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-xs" style={{ color: '#848E9C' }}>✕</button>
        </div>
      )}

      {/* ── Status Banner ────────────────────────────────── */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
           style={{ background: status?.enabled ? 'rgba(3,166,109,0.06)' : '#1E2329', border: `1px solid ${status?.enabled ? 'rgba(3,166,109,0.25)' : '#2B3139'}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
             style={{ background: status?.enabled ? 'rgba(3,166,109,0.12)' : 'rgba(240,185,11,0.12)' }}>
          {status?.enabled
            ? <Shield className="w-6 h-6" style={{ color: '#03A66D' }} />
            : <Unlock className="w-6 h-6" style={{ color: '#F0B90B' }} />}
        </div>
        <div>
          <div className="text-sm font-black" style={{ color: status?.enabled ? '#03A66D' : '#EAECEF' }}>
            {status?.enabled ? 'Two-Factor Authentication Active' : '2FA Not Enabled'}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>
            {status?.enabled
              ? 'Your account is protected with TOTP authenticator'
              : 'Enable 2FA for an extra layer of account security'}
          </p>
        </div>
      </div>

      {/* ── Setup Flow ────────────────────────────────────── */}
      {!status?.enabled && !setupData && (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <KeyRound className="w-10 h-10 mx-auto mb-3" style={{ color: '#627EEA' }} />
          <h3 className="text-sm font-black mb-2" style={{ color: '#EAECEF' }}>Enable Authenticator 2FA</h3>
          <p className="text-xs mb-5 max-w-sm mx-auto leading-relaxed" style={{ color: '#848E9C' }}>
            Secure your account with a time-based one-time password (TOTP) app like Google Authenticator, Authy, or 1Password.
          </p>
          <button onClick={handleSetup} disabled={actionLoading}
                  className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(98,126,234,0.15)', color: '#627EEA', border: '1px solid rgba(98,126,234,0.3)' }}>
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Start 2FA Setup →'}
          </button>
        </div>
      )}

      {/* ── QR Code + Secret ──────────────────────────────── */}
      {setupData && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4" style={{ color: '#627EEA' }} />
            <h3 className="text-sm font-black" style={{ color: '#EAECEF' }}>Scan QR Code</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-center">
            {/* QR Code */}
            <div className="rounded-xl p-3 bg-white flex-shrink-0">
              <img src={setupData.qr_code_url} alt="2FA QR Code" className="w-40 h-40" />
            </div>

            {/* Manual entry */}
            <div className="flex-1 w-full">
              <p className="text-xs mb-2" style={{ color: '#848E9C' }}>Or enter this code manually in your authenticator app:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-xl font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#03A66D' }}>
                  {setupData.secret}
                </div>
                <button onClick={copySecret} className="p-2.5 rounded-xl flex-shrink-0 transition-all hover:opacity-80"
                        style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                  {copied ? <Check className="w-4 h-4" style={{ color: '#03A66D' }} /> : <Copy className="w-4 h-4" style={{ color: '#848E9C' }} />}
                </button>
              </div>
            </div>
          </div>

          {/* Verification input */}
          <div className="pt-2" style={{ borderTop: '1px solid #2B3139' }}>
            <p className="text-xs mb-2 font-semibold" style={{ color: '#848E9C' }}>Enter the 6-digit code from your authenticator:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                placeholder="000000"
                maxLength={6}
                className="flex-1 px-4 py-3 rounded-xl text-center text-2xl font-black tracking-[0.5em] outline-none font-mono"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
              <button onClick={handleVerify} disabled={actionLoading || code.length !== 6}
                      className="px-6 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                      style={{ background: 'rgba(3,166,109,0.15)', color: '#03A66D', border: '1px solid rgba(3,166,109,0.3)' }}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disable Flow ──────────────────────────────────── */}
      {status?.enabled && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <h3 className="text-sm font-black" style={{ color: '#EAECEF' }}>Disable 2FA</h3>
          </div>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            Enter your current 6-digit authenticator code to disable two-factor authentication.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
              placeholder="000000"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl text-center text-2xl font-black tracking-[0.5em] outline-none font-mono"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
            />
            <button onClick={handleDisable} disabled={actionLoading || code.length !== 6}
                    className="px-6 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.3)' }}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.25)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#CF304A' }} />
          <p className="text-xs font-medium" style={{ color: '#CF304A' }}>{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#848E9C' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
          TOTP (Time-Based One-Time Password) generates a unique 6-digit code every 30 seconds.
          Your secret is stored securely and never shared. Compatible with Google Authenticator, Authy, 1Password, and Microsoft Authenticator.
        </p>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { Shield, KeyRound, CheckCircle2, Loader2, Smartphone, AlertTriangle, Lock, Unlock, Copy, Check } from 'lucide-react';

/**
 * CCS Technology — Two-Factor Authentication Setup
 * Uses server-side TOTP verification via manage2FA backend function.
 * Secret is generated and stored server-side — never exposed client-side beyond QR setup.
 */
export default function TwoFactorSetup({ userProfile }) {
  const [step, setStep] = useState('idle'); // idle | loading | setup | verifying | enabled | error
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Check 2FA status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await ccs.functions.invoke('manage2FA', { action: 'status' });
        const data = res?.data || res;
        if (data.enabled) setStep('enabled');
        else setStep('idle');
      } catch (e) {
        setStep('idle');
      }
    };
    checkStatus();
  }, []);

  // TOTP countdown timer
  useEffect(() => {
    if (step !== 'setup') return;
    const interval = setInterval(() => {
      setCountdown(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // ── Start 2FA Setup (server-side secret generation) ───────────────────
  const handleStart = async () => {
    setStep('loading');
    setError('');
    try {
      const res = await ccs.functions.invoke('manage2FA', { action: 'setup' });
      const data = res?.data || res;
      if (data.error) {
        setError(data.error);
        setStep('idle');
        return;
      }
      setSecret(data.secret);
      setQrUrl(data.qr_code_url);
      setStep('setup');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start 2FA setup');
      setStep('idle');
    }
  };

  // ── Verify TOTP code (server-side verification) ────────────────────────
  const handleVerify = async () => {
    if (userCode.length !== 6) { setError('Enter 6 digits'); return; }
    setVerifying(true);
    setError('');
    try {
      const res = await ccs.functions.invoke('manage2FA', {
        action: 'verify',
        code: userCode,
      });
      const data = res?.data || res;
      if (data.error) {
        setError(data.error);
      } else if (data.enabled) {
        setStep('enabled');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Verification failed');
    }
    setVerifying(false);
  };

  // ── Disable 2FA (requires current code) ───────────────────────────────
  const handleDisable = async () => {
    const code = prompt('Enter your current 6-digit 2FA code to disable:');
    if (!code) return;
    try {
      const res = await ccs.functions.invoke('manage2FA', {
        action: 'disable',
        code,
      });
      const data = res?.data || res;
      if (data.error) {
        alert(data.error);
        return;
      }
      setSecret('');
      setUserCode('');
      setStep('idle');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to disable 2FA');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── ENABLED STATE ──────────────────────────────────────────────────────
  if (step === 'enabled') {
    return (
      <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid rgba(3,166,109,0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.12)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: '#03A66D' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Two-Factor Authentication</h3>
              <p className="text-xs" style={{ color: '#03A66D' }}>✓ Enabled & Active — Server-Verified TOTP</p>
            </div>
          </div>
          <Lock className="w-5 h-5" style={{ color: '#03A66D' }} />
        </div>
        <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
          Your account is protected with RFC 6238 TOTP-based 2FA. Verification is performed server-side — your secret never leaves the secure backend.
        </p>
        <button onClick={handleDisable}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
          <Unlock className="w-3.5 h-3.5" />
          Disable 2FA
        </button>
      </div>
    );
  }

  // ── LOADING STATE ──────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="rounded-xl p-5 flex items-center justify-center py-12" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F0B90B' }} />
      </div>
    );
  }

  // ── SETUP STATE (QR + code entry) ──────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4 h-4" style={{ color: '#F0B90B' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Scan QR Code</h3>
        </div>

        <div className="flex flex-col items-center gap-4 mb-5">
          <div className="p-3 rounded-xl" style={{ background: '#fff' }}>
            <img src={qrUrl} alt="2FA QR Code" width={160} height={160} />
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Or enter manually:</span>
              <button onClick={copySecret} className="text-xs font-bold flex items-center gap-1" style={{ color: copied ? '#03A66D' : '#F0B90B' }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-2.5 rounded-lg font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#03A66D' }}>
              {secret}
            </div>
          </div>
        </div>

        {/* TOTP countdown bar */}
        <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: '#848E9C' }}>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
            <div className="h-full transition-all" style={{ width: `${(countdown / 30) * 100}%`, background: '#F0B90B' }} />
          </div>
          <span style={{ color: '#F0B90B' }}>{countdown}s</span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Enter 6-digit code from your authenticator app</label>
          <input
            value={userCode}
            onChange={e => { setUserCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="000000"
            className="w-full px-3 py-3 rounded-lg text-center text-2xl font-black tracking-[0.5em] outline-none font-mono"
            style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#F0B90B' }}
            inputMode="numeric"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: '#CF304A' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => { setStep('idle'); setSecret(''); setUserCode(''); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
            Cancel
          </button>
          <button onClick={handleVerify} disabled={verifying || userCode.length !== 6}
            className="flex-1 py-2.5 rounded-lg text-sm font-black text-black transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Verify & Enable
          </button>
        </div>
      </div>
    );
  }

  // ── IDLE STATE ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
            <Shield className="w-4 h-4" style={{ color: '#F0B90B' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Two-Factor Authentication</h3>
            <p className="text-xs" style={{ color: '#848E9C' }}>Server-verified · RFC 6238 TOTP</p>
          </div>
        </div>
        <KeyRound className="w-5 h-5" style={{ color: '#848E9C' }} />
      </div>
      <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
        Add an extra layer of security. You'll need a 6-digit code from Google Authenticator, Authy, or any TOTP app to log in. Verification is performed server-side.
      </p>
      <button onClick={handleStart}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-black transition-all hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
        Enable 2FA
      </button>
    </div>
  );
}
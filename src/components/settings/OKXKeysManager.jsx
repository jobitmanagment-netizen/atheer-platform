import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Key, CheckCircle2, XCircle, Trash2, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

export default function OKXKeysManager() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ api_key: '', api_secret: '', passphrase: '' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await ccs.functions.invoke('manageOKXKeys', { action: 'status' });
      setStatus(res.data);
    } catch (e) {
      logger.error('OKXKeysManager', 'OKX status error', { error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSave = async () => {
    setError('');
    if (!form.api_key || !form.api_secret || !form.passphrase) {
      setError('Please fill in all three fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await ccs.functions.invoke('manageOKXKeys', { action: 'save', ...form });
      if (res.data.error) {
        setError(res.data.okx_error || res.data.error);
      } else {
        setForm({ api_key: '', api_secret: '', passphrase: '' });
        setShowForm(false);
        await loadStatus();
      }
    } catch (e) {
      setError(e?.response?.data?.okx_error || e?.response?.data?.error || 'Failed to save keys.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    try {
      const res = await ccs.functions.invoke('manageOKXKeys', { action: 'test' });
      if (!res.data.verified) setError(res.data.okx_message || 'Connection test failed.');
      await loadStatus();
    } catch (e) {
      setError('Test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove your OKX API keys? Live trading will be disabled.')) return;
    await ccs.functions.invoke('manageOKXKeys', { action: 'delete' });
    setStatus({ connected: false });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs" style={{ color: '#848E9C' }}>
      <Loader2 className="w-4 h-4 animate-spin" /> Loading OKX status...
    </div>;
  }

  const connected = status?.connected;

  return (
    <div className="space-y-4">
      {/* Connected state */}
      {connected && !showForm && (
        <div className="rounded-lg p-3.5" style={{ background: '#0B0E11', border: '1px solid rgba(3,166,109,0.25)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.12)' }}>
                {status.is_verified
                  ? <CheckCircle2 className="w-5 h-5" style={{ color: '#03A66D' }} />
                  : <XCircle className="w-5 h-5" style={{ color: '#CF304A' }} />}
              </div>
              <div>
                <div className="text-sm font-semibold flex items-center gap-2" style={{ color: '#EAECEF' }}>
                  OKX Connected
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#1E2329', color: '#848E9C' }}>
                    {status.api_key_masked}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: status.is_verified ? '#03A66D' : '#CF304A' }}>
                  {status.is_verified ? 'Verified — live trading enabled' : 'Verification failed — re-test or update keys'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleTest} disabled={testing}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Test
              </button>
              <button onClick={() => setShowForm(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(240,185,11,0.08)', color: '#F0B90B' }}>
                Update
              </button>
              <button onClick={handleDelete}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not connected / form */}
      {(!connected || showForm) && (
        <div className="space-y-3">
          {!connected && (
            <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
              Connect your own OKX account to trade live. Your keys are encrypted with AES-256-GCM and never shared.
              Create API keys in your OKX account with <span style={{ color: '#EAECEF' }}>Trade</span> permission.
              <a href="https://www.okx.com/account/my-api" target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 ml-1" style={{ color: '#F0B90B' }}>
                Open OKX API page <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>API Key</label>
            <input value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                   placeholder="OKX API Key" autoComplete="off"
                   className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>API Secret</label>
            <input type="password" value={form.api_secret} onChange={e => setForm(p => ({ ...p, api_secret: e.target.value }))}
                   placeholder="OKX API Secret" autoComplete="off"
                   className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Passphrase</label>
            <input type="password" value={form.passphrase} onChange={e => setForm(p => ({ ...p, passphrase: e.target.value }))}
                   placeholder="OKX API Passphrase" autoComplete="off"
                   className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg flex items-start gap-2"
                 style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            {showForm && connected && (
              <button onClick={() => { setShowForm(false); setError(''); setForm({ api_key: '', api_secret: '', passphrase: '' }); }}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
                Cancel
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying with OKX...</> : <><Key className="w-4 h-4" /> Connect & Verify</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
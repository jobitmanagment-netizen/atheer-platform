import { useState } from 'react';
import { ccs } from '@/api/ccsClient';
import { Lock, Unlock, Key, Copy, Check, Loader2, Shield, FileText } from 'lucide-react';

/**
 * CCS Technology — Military-Grade Encryption Tools
 * AES-256-GCM encrypt/decrypt via backend militaryCrypto function
 * PBKDF2-SHA512 key derivation (100,000 iterations)
 */
export default function MilitaryCrypto() {
  const [mode, setMode] = useState('encrypt'); // encrypt | decrypt | derive

  // Encrypt state
  const [encryptInput, setEncryptInput] = useState('');
  const [encryptResult, setEncryptResult] = useState(null);
  const [encrypting, setEncrypting] = useState(false);

  // Decrypt state
  const [decryptCT, setDecryptCT] = useState('');
  const [decryptIV, setDecryptIV] = useState('');
  const [decryptResult, setDecryptResult] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  // Key derivation state
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState('');
  const [derivedKey, setDerivedKey] = useState(null);
  const [deriving, setDeriving] = useState(false);

  const [copied, setCopied] = useState(null);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── AES-256-GCM Encrypt ───────────────────────────────────────
  const handleEncrypt = async () => {
    if (!encryptInput.trim()) return;
    setEncrypting(true);
    try {
      const res = await ccs.functions.invoke('militaryCrypto', {
        action: 'encrypt',
        data: encryptInput,
      });
      const data = res?.data || res;
      if (data.error) setEncryptResult({ error: data.error });
      else setEncryptResult(data);
    } catch (e) {
      setEncryptResult({ error: e.response?.data?.error || 'Encryption failed' });
    }
    setEncrypting(false);
  };

  // ── AES-256-GCM Decrypt ───────────────────────────────────────
  const handleDecrypt = async () => {
    if (!decryptCT.trim() || !decryptIV.trim()) return;
    setDecrypting(true);
    setDecryptError('');
    setDecryptResult(null);
    try {
      const res = await ccs.functions.invoke('militaryCrypto', {
        action: 'decrypt',
        ciphertext: decryptCT,
        iv: decryptIV,
      });
      const data = res?.data || res;
      if (data.error) {
        setDecryptError(data.error);
      } else {
        setDecryptResult(data.plaintext);
      }
    } catch (e) {
      setDecryptError(e.response?.data?.error || 'Decryption failed');
    }
    setDecrypting(false);
  };

  // ── PBKDF2 Key Derivation ─────────────────────────────────────
  const handleDerive = async () => {
    if (!password || !salt) return;
    setDeriving(true);
    try {
      const res = await ccs.functions.invoke('militaryCrypto', {
        action: 'derive_key',
        password,
        salt,
        iterations: 100000,
      });
      const data = res?.data || res;
      if (data.error) setDerivedKey({ error: data.error });
      else setDerivedKey(data);
    } catch (e) {
      setDerivedKey({ error: e.response?.data?.error || 'Key derivation failed' });
    }
    setDeriving(false);
  };

  return (
    <div className="space-y-5">
      {/* Algorithm Badge */}
      <div className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3"
           style={{ background: 'linear-gradient(135deg, #0D1117 0%, #0a1520 100%)', border: '1px solid rgba(3,166,109,0.25)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.15)', border: '1px solid rgba(3,166,109,0.3)' }}>
            <Shield className="w-5 h-5" style={{ color: '#03A66D' }} />
          </div>
          <div>
            <div className="text-sm font-black" style={{ color: '#EAECEF' }}>Military-Grade Cryptographic Engine</div>
            <div className="text-xs mt-0.5" style={{ color: '#4B5563' }}>AES-256-GCM · SHA-512 · HMAC-SHA512 · PBKDF2 (100K iterations) · NIST/FIPS aligned</div>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#03A66D' }} />
          ACTIVE
        </span>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
        {[
          { id: 'encrypt', label: 'AES-256-GCM Encrypt', icon: Lock },
          { id: 'decrypt', label: 'AES-256-GCM Decrypt', icon: Unlock },
          { id: 'derive',  label: 'PBKDF2 Key Derivation', icon: Key },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: mode === m.id ? '#1E2329' : 'transparent',
                    color: mode === m.id ? '#03A66D' : '#848E9C',
                    border: mode === m.id ? '1px solid rgba(3,166,109,0.3)' : '1px solid transparent',
                  }}>
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* ── ENCRYPT MODE ────────────────────────────────────────── */}
      {mode === 'encrypt' && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: '#03A66D' }} />
            <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>AES-256-GCM Encryption</h3>
          </div>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            Encrypt sensitive data (IBANs, document numbers, wallet addresses) using AES-256-GCM authenticated encryption. Key is derived via PBKDF2-HMAC-SHA512 with 100,000 iterations.
          </p>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Plaintext to Encrypt</label>
            <textarea value={encryptInput} onChange={e => { setEncryptInput(e.target.value); setEncryptResult(null); }}
                      rows={4} placeholder="Enter sensitive data to encrypt (e.g., IBAN, document number, private key)..."
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <button onClick={handleEncrypt} disabled={encrypting || !encryptInput.trim()}
                  className="w-full py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #03A66D, #04D489)' }}>
            {encrypting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {encrypting ? 'Encrypting...' : 'Encrypt with AES-256-GCM'}
          </button>
          {encryptResult && !encryptResult.error && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Ciphertext (Base64)</span>
                  <button onClick={() => handleCopy(encryptResult.ciphertext, 'ct')} className="text-xs font-bold flex items-center gap-1" style={{ color: copied === 'ct' ? '#03A66D' : '#F0B90B' }}>
                    {copied === 'ct' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'ct' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-xl font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid rgba(3,166,109,0.3)', color: '#03A66D' }}>
                  {encryptResult.ciphertext}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>IV (Initialization Vector — 96-bit)</span>
                  <button onClick={() => handleCopy(encryptResult.iv, 'iv')} className="text-xs font-bold flex items-center gap-1" style={{ color: copied === 'iv' ? '#03A66D' : '#F0B90B' }}>
                    {copied === 'iv' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'iv' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-xl font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#F0B90B' }}>
                  {encryptResult.iv}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#4B5563' }}>
                <Shield className="w-3 h-3" style={{ color: '#03A66D' }} />
                Algorithm: {encryptResult.algorithm} · Key: {encryptResult.key_derivation}
              </div>
            </div>
          )}
          {encryptResult?.error && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
              {encryptResult.error}
            </div>
          )}
        </div>
      )}

      {/* ── DECRYPT MODE ────────────────────────────────────────── */}
      {mode === 'decrypt' && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5" style={{ color: '#F0B90B' }} />
            <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>AES-256-GCM Decryption</h3>
          </div>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            Decrypt data encrypted with the military crypto engine. Both ciphertext and IV are required.
          </p>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Ciphertext (Base64)</label>
            <textarea value={decryptCT} onChange={e => { setDecryptCT(e.target.value); setDecryptResult(null); setDecryptError(''); }}
                      rows={3} placeholder="Paste ciphertext..."
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono"
                      style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>IV (Base64)</label>
            <input value={decryptIV} onChange={e => { setDecryptIV(e.target.value); setDecryptResult(null); setDecryptError(''); }}
                   placeholder="Paste IV..."
                   className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <button onClick={handleDecrypt} disabled={decrypting || !decryptCT.trim() || !decryptIV.trim()}
                  className="w-full py-3 rounded-xl text-sm font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(240,185,11,0.15)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.3)' }}>
            {decrypting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            {decrypting ? 'Decrypting...' : 'Decrypt'}
          </button>
          {decryptError && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
              {decryptError}
            </div>
          )}
          {decryptResult !== null && (
            <div>
              <span className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Decrypted Plaintext</span>
              <div className="p-3 rounded-xl font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid rgba(3,166,109,0.3)', color: '#03A66D' }}>
                {decryptResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KEY DERIVATION MODE ─────────────────────────────────── */}
      {mode === 'derive' && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" style={{ color: '#627EEA' }} />
            <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>PBKDF2 Key Derivation</h3>
          </div>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            Derive a 512-bit cryptographic key from a password using PBKDF2-HMAC-SHA512 with 100,000 iterations (OWASP recommended minimum).
          </p>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setDerivedKey(null); }}
                   placeholder="Enter password..."
                   className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Salt</label>
            <input value={salt} onChange={e => { setSalt(e.target.value); setDerivedKey(null); }}
                   placeholder="Enter salt (or use any unique string)..."
                   className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <button onClick={handleDerive} disabled={deriving || !password || !salt}
                  className="w-full py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #627EEA, #8247E5)' }}>
            {deriving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {deriving ? 'Deriving Key (100K iterations)...' : 'Derive 512-bit Key'}
          </button>
          {derivedKey && !derivedKey.error && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Derived Key (512-bit / 128 hex chars)</span>
                  <button onClick={() => handleCopy(derivedKey.derived_key, 'dk')} className="text-xs font-bold flex items-center gap-1" style={{ color: copied === 'dk' ? '#03A66D' : '#F0B90B' }}>
                    {copied === 'dk' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'dk' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-xl font-mono text-xs break-all" style={{ background: '#0B0E11', border: '1px solid rgba(98,126,234,0.3)', color: '#627EEA' }}>
                  {derivedKey.derived_key}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#4B5563' }}>
                <FileText className="w-3 h-3" style={{ color: '#627EEA' }} />
                {derivedKey.note}
              </div>
            </div>
          )}
          {derivedKey?.error && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
              {derivedKey.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
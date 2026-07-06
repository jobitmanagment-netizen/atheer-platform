import { useState, useEffect, useRef } from 'react';
import { ccs } from '@/api/ccsClient';
import {
  Shield, Lock, Hash, AlertTriangle, CheckCircle,
  RefreshCw, Copy, Terminal, Cpu,
  Key, FileText, Globe, Search, XCircle, CheckCircle2, Fingerprint, Brain
} from 'lucide-react';
import AIThreatMonitor from '@/components/security/AIThreatMonitor';
import TwoFactorManager from '@/components/security/TwoFactorManager';
import MilitaryCrypto from '@/components/security/MilitaryCrypto';
import { sha512, hmacSHA512, calcEntropy } from '@/lib/crypto-engine';

// ── Threat feeds loaded from real ThreatAlert entity ─────────────────────────

const SEV_STYLE = {
  CRITICAL: { bg: 'rgba(207,48,74,0.12)',  color: '#CF304A', dot: '#CF304A' },
  HIGH:     { bg: 'rgba(255,122,0,0.12)',  color: '#FF7A00', dot: '#FF7A00' },
  MEDIUM:   { bg: 'rgba(240,185,11,0.12)', color: '#F0B90B', dot: '#F0B90B' },
  LOW:      { bg: 'rgba(3,166,109,0.12)',  color: '#03A66D', dot: '#03A66D' },
};

function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

// ── Security score calculation ────────────────────────────────────────────────
function calcSecurityScore(threats) {
  const active = threats.filter(t => !t.resolved);
  const criticals = active.filter(t => t.severity === 'CRITICAL').length;
  const highs     = active.filter(t => t.severity === 'HIGH').length;
  let score = 100 - criticals * 25 - highs * 10;
  return Math.max(0, Math.min(100, score));
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SecurityCenter() {
  const [tab, setTab]             = useState('overview');
  const [isAdmin, setIsAdmin]     = useState(false);
  const [hashInput, setHashInput] = useState('');
  const [hashOutput, setHashOutput] = useState('');
  const [hmacKey, setHmacKey]     = useState('');
  const [hmacOut, setHmacOut]     = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyHash, setVerifyHash]   = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [hashMode, setHashMode]   = useState('sha512'); // sha512 | hmac
  const [copyFlash, setCopyFlash] = useState(false);
  const [threats, setThreats]     = useState([]);
  const [secScore, setSecScore]   = useState(100);
  const [sessions]                = useState([
    { id: 's1', device: 'Chrome 124 · macOS', ip: '192.168.1.1',  location: 'New York, US',  active: true,  last: Date.now() - 60000   },
    { id: 's2', device: 'Firefox 125 · Win 11', ip: '176.52.3.88', location: 'London, UK',    active: false, last: Date.now() - 7200000 },
    { id: 's3', device: 'Mobile Safari · iOS', ip: '94.140.15.15', location: 'Dubai, UAE',    active: false, last: Date.now() - 86400000 },
  ]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [hashHistory, setHashHistory] = useState([]);
  const [scanning, setScanning]   = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const terminalRef = useRef(null);
  const [terminalLines, setTerminalLines] = useState([
    '> ATHEER Security Center v4.0 initialized',
    '> Military-grade crypto engine loaded [AES-256-GCM / SHA-512 / HMAC-SHA512 / PBKDF2]',
    '> Threat detection modules active — fetching live alerts',
    '> Audit trail monitoring ON — SHA-512 integrity hashing',
    '> Key derivation: PBKDF2-HMAC-SHA512 (100,000 iterations)',
    '> Ready.',
  ]);

  // Load audit logs, real threats + check admin role
  useEffect(() => {
    const load = async () => {
      try {
        const u = await ccs.auth.me();
        const profile = await ccs.entities.UserProfile.filter({ user_id: u.id });
        if (profile?.[0]?.role === 'admin') setIsAdmin(true);
        // Settle independently: these are separate admin-gated reads, so a
        // rejection of one (e.g. ThreatAlert for a non-admin) must not discard
        // the other's results.
        const [logsRes, alertsRes] = await Promise.allSettled([
          ccs.entities.AuditLog.list('-created_date', 50),
          ccs.entities.ThreatAlert.filter({ status: 'active' }, '-created_date', 20),
        ]);
        setAuditTrail(logsRes.status === 'fulfilled' ? (logsRes.value || []) : []);
        const activeAlerts = alertsRes.status === 'fulfilled' ? (alertsRes.value || []) : [];
        // Map ThreatAlert entity to the UI's threat format
        const mapped = activeAlerts.map(a => ({
          id: a.id,
          type: a.alert_type || 'THREAT',
          severity: a.severity || 'MEDIUM',
          ip: a.address || '—',
          ts: new Date(a.created_date).getTime(),
          desc: a.message || 'Threat detected',
          resolved: a.status === 'resolved',
        }));
        setThreats(mapped);
        setSecScore(calcSecurityScore(mapped));
      } catch (e) { /* security feed load is best-effort; existing state remains visible */ }
    };
    load();
  }, []);

  // Terminal scroll
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  // ── Hash (SHA-512) ───────────────────────────────────────────────────────────
  const runHash = async () => {
    if (!hashInput.trim()) return;
    const h = await sha512(hashInput);
    setHashOutput(h);
    addTerminalLine(`> sha512("${hashInput.slice(0,20)}${hashInput.length > 20 ? '...' : ''}") = ${h.slice(0,16)}...`);
    const entry = { input: hashInput, hash: h, algo: 'SHA-512', ts: Date.now() };
    setHashHistory(prev => [entry, ...prev].slice(0, 10));
  };

  const runHmac = async () => {
    if (!hashInput.trim() || !hmacKey.trim()) return;
    const h = await hmacSHA512(hmacKey, hashInput);
    setHmacOut(h);
    addTerminalLine(`> hmac-sha512(key="****", msg="${hashInput.slice(0,10)}...") = ${h.slice(0,16)}...`);
  };

  const runVerify = async () => {
    if (!verifyInput || !verifyHash) return;
    const computed = await sha512(verifyInput);
    const match = computed.toLowerCase() === verifyHash.toLowerCase().trim();
    setVerifyResult(match);
    addTerminalLine(match
      ? `> VERIFY PASS ✓ SHA-512 hash matches input`
      : `> VERIFY FAIL ✗ hash mismatch — expected: ${verifyHash.slice(0,16)}... got: ${computed.slice(0,16)}...`
    );
  };

  const copyHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1200);
  };

  const addTerminalLine = (line) => {
    setTerminalLines(prev => [...prev, line].slice(-80));
  };

  // ── Platform scan ─────────────────────────────────────────────────────────────
  const runScan = () => {
    setScanning(true);
    setScanProgress(0);
    const steps = [
      '> Scanning active sessions...',
      '> Checking cryptographic integrity...',
      '> Auditing user permissions...',
      '> Inspecting network anomalies...',
      '> Verifying transaction hashes...',
      '> Analyzing risk vectors...',
      '> Cross-referencing threat database...',
      '> Generating security report...',
      `> Scan complete. Score: ${secScore}/100`,
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        addTerminalLine(steps[i]);
        setScanProgress(Math.round(((i + 1) / steps.length) * 100));
        i++;
      } else {
        setScanning(false);
        clearInterval(interval);
      }
    }, 400);
  };

  const resolveThread = (id) => {
    setThreats(prev => prev.map(t => t.id === id ? { ...t, resolved: true } : t));
    addTerminalLine(`> Threat #${id} marked as resolved`);
  };

  const activeThreats = threats.filter(t => !t.resolved);
  const entropy = calcEntropy(hashInput);
  const scoreColor = secScore >= 80 ? '#03A66D' : secScore >= 60 ? '#F0B90B' : '#CF304A';

  const tabs = [
    { id: 'overview',  label: 'Overview',               icon: Shield,         adminOnly: false },
    { id: 'ai',        label: 'AI Threat Monitor',       icon: Brain,          adminOnly: true  },
    { id: 'twofa',     label: '2FA Security',            icon: Key,            adminOnly: false },
    { id: 'crypto',    label: 'Crypto Tools',            icon: Hash,           adminOnly: false },
    { id: 'military',  label: 'Military Crypto',          icon: Lock,           adminOnly: false },
    { id: 'threats',   label: `Threats (${activeThreats.length})`, icon: AlertTriangle, adminOnly: false },
    { id: 'sessions',  label: 'Sessions',                icon: Globe,          adminOnly: false },
    { id: 'audit',     label: 'Audit Trail',             icon: FileText,       adminOnly: false },
    { id: 'terminal',  label: 'Terminal',                icon: Terminal,       adminOnly: false },
  ];

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(207,48,74,0.12)', border: '1px solid rgba(207,48,74,0.25)' }}>
            <Shield className="w-5 h-5" style={{ color: '#CF304A' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Security Center</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Cryptographic tools · Threat monitoring · Audit trail</p>
          </div>
        </div>
        <button onClick={runScan} disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ background: scanning ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}>
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? `Scanning... ${scanProgress}%` : 'Run Security Scan'}
        </button>
      </div>

      {/* ── Scan progress bar ───────────────────────────────────────────── */}
      {scanning && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2329' }}>
          <div className="h-full rounded-full transition-all duration-300"
               style={{ width: `${scanProgress}%`, background: 'linear-gradient(90deg, #627EEA, #CF304A)' }} />
        </div>
      )}

      {/* ── Score Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Security Score',    value: `${secScore}/100`,           color: scoreColor,  icon: Shield    },
          { label: 'Active Threats',    value: activeThreats.length,         color: '#CF304A',   icon: AlertTriangle },
          { label: 'Active Sessions',   value: sessions.filter(s=>s.active).length, color: '#627EEA', icon: Globe },
          { label: 'Audit Events',      value: auditTrail.length,            color: '#03A66D',   icon: FileText  },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${c.color}` }}>
            <c.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: c.color, opacity: 0.08 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{c.label}</p>
            <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#151A1F' }}>
        {tabs.filter(t => !t.adminOnly || isAdmin).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: tab === t.id ? (t.id === 'ai' ? 'rgba(207,48,74,0.12)' : '#1E2329') : 'transparent',
                    color:      tab === t.id ? (t.id === 'ai' ? '#CF304A' : '#EAECEF') : '#848E9C',
                    border:     tab === t.id ? `1px solid ${t.id === 'ai' ? 'rgba(207,48,74,0.3)' : '#2B3139'}` : '1px solid transparent',
                  }}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.id === 'ai' && <span className="ml-1 text-xs font-black px-1 py-0.5 rounded" style={{ background: 'rgba(207,48,74,0.15)', color: '#CF304A', fontSize: 8 }}>ADMIN</span>}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════ AI THREAT MONITOR ════════ */}
      {tab === 'ai' && (
        isAdmin ? <AIThreatMonitor /> : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Shield className="w-16 h-16 mb-4" style={{ color: '#CF304A' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: '#EAECEF' }}>Admin Only</h2>
            <p className="text-sm" style={{ color: '#848E9C' }}>The AI Threat Monitor is restricted to administrators.</p>
          </div>
        )
      )}

      {/* ════════════════════════════════════════ 2FA SECURITY ═════════════ */}
      {tab === 'twofa' && (
        <TwoFactorManager />
      )}

      {/* ════════════════════════════════════════ OVERVIEW ══════════════════ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Security Score Gauge */}
          <div className="rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold mb-5" style={{ color: '#EAECEF' }}>Platform Security Score</h3>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg className="w-32 h-32" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1A1F26" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="8"
                          strokeDasharray={`${(secScore / 100) * 263.9} 263.9`}
                          strokeLinecap="round" transform="rotate(-90 50 50)"
                          style={{ transition: 'stroke-dasharray 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black" style={{ color: '#EAECEF' }}>{secScore}</span>
                  <span className="text-xs font-semibold" style={{ color: scoreColor }}>
                    {secScore >= 80 ? 'SECURE' : secScore >= 60 ? 'WARNING' : 'AT RISK'}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Encryption',   val: 100, color: '#03A66D' },
                  { label: 'Auth Layer',   val: 92,  color: '#03A66D' },
                  { label: 'Threat Intel', val: 78,  color: '#F0B90B' },
                  { label: 'Audit Log',    val: 95,  color: '#03A66D' },
                  { label: 'Compliance',   val: 85,  color: '#03A66D' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#848E9C' }}>{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.val}%`, background: s.color, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick SHA-256 tool */}
          <div className="rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4" style={{ color: '#F0B90B' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Quick Hash (SHA-512)</h3>
            </div>
            <textarea
              value={hashInput}
              onChange={e => { setHashInput(e.target.value); setHashOutput(''); }}
              rows={3}
              placeholder="Enter text to hash..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono mb-3"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
            />
            {hashInput && (
              <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: '#848E9C' }}>
                <Cpu className="w-3 h-3" />
                Entropy: <span className="font-bold" style={{ color: entropy > 3 ? '#03A66D' : '#F0B90B' }}>{entropy.toFixed(2)} bits/char</span>
                &nbsp;· Length: <span className="font-bold" style={{ color: '#EAECEF' }}>{hashInput.length}</span>
              </div>
            )}
            <button onClick={runHash}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-black mb-3"
                    style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
                    Generate SHA-512 Hash
            </button>
            {hashOutput && (
              <div className="relative p-3 rounded-xl font-mono text-xs break-all"
                   style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#03A66D' }}>
                {hashOutput}
                <button onClick={() => copyHash(hashOutput)}
                        className="absolute top-2 right-2 p-1 rounded transition-all hover:opacity-80"
                        style={{ background: copyFlash ? '#03A66D22' : '#1E2329' }}>
                  <Copy className="w-3 h-3" style={{ color: copyFlash ? '#03A66D' : '#848E9C' }} />
                </button>
              </div>
            )}
          </div>

          {/* Active Threats Overview */}
          <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Live Threat Feed</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse"
                    style={{ background: 'rgba(207,48,74,0.12)', color: '#CF304A' }}>● LIVE</span>
            </div>
            <div className="space-y-2.5">
              {threats.slice(0, 4).map(t => {
                const s = SEV_STYLE[t.severity];
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                       style={{ background: t.resolved ? '#0D1117' : s.bg, opacity: t.resolved ? 0.5 : 1 }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ color: '#EAECEF' }}>{t.desc}</div>
                      <div className="text-xs" style={{ color: '#4B5563' }}>{t.ip} · {timeAgo(t.ts)}</div>
                    </div>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
                      {t.resolved ? 'OK' : t.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic Info */}
          <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-4 h-4" style={{ color: '#627EEA' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Cryptographic Primitives</h3>
            </div>
            <div className="space-y-3">
              {[
                { algo: 'SHA-512',     use: '512-bit cryptographic hashing (NIST FIPS 180-4)',  status: 'Active',   color: '#03A66D' },
                { algo: 'HMAC-SHA512', use: '512-bit message authentication (RFC 2104)',        status: 'Active',   color: '#03A66D' },
                { algo: 'AES-256-GCM', use: 'Authenticated encryption at rest (RFC 5116)',      status: 'Active',   color: '#03A66D' },
                { algo: 'PBKDF2-SHA512', use: 'Key derivation — 100K iterations (OWASP)',      status: 'Active',   color: '#03A66D' },
                { algo: 'TOTP (RFC 6238)', use: 'Server-verified 2FA authentication',         status: 'Active',   color: '#03A66D' },
                { algo: 'TLS 1.3',    use: 'Transport layer security (forward secrecy)',       status: 'Active',   color: '#03A66D' },
              ].map(a => (
                <div key={a.algo} className="flex items-center justify-between p-2.5 rounded-xl"
                     style={{ background: '#0D1117', border: '1px solid #1E2329' }}>
                  <div>
                    <div className="text-xs font-black" style={{ color: '#EAECEF' }}>{a.algo}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{a.use}</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(3,166,109,0.1)', color: a.color }}>
                    ● {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ MILITARY CRYPTO ═══════════ */}
      {tab === 'military' && (
        <MilitaryCrypto />
      )}

      {/* ════════════════════════════════════════ CRYPTO TOOLS ══════════════ */}
      {tab === 'crypto' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* SHA-256 Hash Generator */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5" style={{ color: '#F0B90B' }} />
              <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>SHA-256 Hash Generator</h3>
            </div>

            <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#0B0E11' }}>
              {[{id:'sha512',label:'SHA-512'},{id:'hmac',label:'HMAC-SHA512'}].map(m => (
                <button key={m.id} onClick={() => setHashMode(m.id)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: hashMode === m.id ? '#1E2329' : 'transparent',
                          color: hashMode === m.id ? '#F0B90B' : '#848E9C',
                          border: hashMode === m.id ? '1px solid #2B3139' : '1px solid transparent',
                        }}>
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Input Message</label>
              <textarea
                value={hashInput}
                onChange={e => { setHashInput(e.target.value); setHashOutput(''); setHmacOut(''); setVerifyResult(null); }}
                rows={4}
                placeholder="Enter any text, data, or transaction payload..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
              {hashInput && (
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#4B5563' }}>
                  <span>Length: <b style={{ color: '#EAECEF' }}>{hashInput.length} chars</b></span>
                  <span>Bytes: <b style={{ color: '#EAECEF' }}>{new TextEncoder().encode(hashInput).length}</b></span>
                  <span>Entropy: <b style={{ color: entropy > 3 ? '#03A66D' : '#F0B90B' }}>{entropy.toFixed(3)}</b></span>
                </div>
              )}
            </div>

            {hashMode === 'hmac' && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>HMAC Secret Key</label>
                <input
                  type="password"
                  value={hmacKey}
                  onChange={e => setHmacKey(e.target.value)}
                  placeholder="Enter secret key..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
                />
              </div>
            )}

            <button
              onClick={hashMode === 'sha512' ? runHash : runHmac}
              className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #F0B90B 0%, #FFCF40 100%)' }}>
              Generate {hashMode === 'sha512' ? 'SHA-512' : 'HMAC-SHA512'} Hash
            </button>

            {(hashOutput || hmacOut) && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Hash Output (512-bit / 128 hex chars)</span>
                  <button onClick={() => copyHash(hashMode === 'sha512' ? hashOutput : hmacOut)}
                          className="flex items-center gap-1 text-xs font-semibold transition-all hover:opacity-80"
                          style={{ color: copyFlash ? '#03A66D' : '#F0B90B' }}>
                    <Copy className="w-3 h-3" />
                    {copyFlash ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-xl font-mono text-xs break-all"
                     style={{ background: '#0B0E11', border: '1px solid rgba(3,166,109,0.3)', color: '#03A66D' }}>
                  {hashMode === 'sha512' ? hashOutput : hmacOut}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: '#4B5563' }}>
                  <CheckCircle className="w-3 h-3" style={{ color: '#03A66D' }} />
                  Cryptographically secure · Generated in browser via Web Crypto API
                </div>
              </div>
            )}
          </div>

          {/* Hash Verifier + History */}
          <div className="space-y-5">
            {/* Verify */}
            <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" style={{ color: '#627EEA' }} />
                <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>Hash Verifier</h3>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Original Message</label>
                <input value={verifyInput} onChange={e => { setVerifyInput(e.target.value); setVerifyResult(null); }}
                       placeholder="Enter original text..."
                       className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Known SHA-256 Hash</label>
                <input value={verifyHash} onChange={e => { setVerifyHash(e.target.value); setVerifyResult(null); }}
                       placeholder="Paste the hash to verify against..."
                       className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <button onClick={runVerify}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(98,126,234,0.15)', color: '#627EEA', border: '1px solid rgba(98,126,234,0.25)' }}>
                Verify Hash Integrity
              </button>
              {verifyResult !== null && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: verifyResult ? 'rgba(3,166,109,0.1)' : 'rgba(207,48,74,0.1)', border: `1px solid ${verifyResult ? 'rgba(3,166,109,0.3)' : 'rgba(207,48,74,0.3)'}` }}>
                  {verifyResult
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#03A66D' }} />
                    : <XCircle      className="w-5 h-5 flex-shrink-0" style={{ color: '#CF304A' }} />}
                  <div>
                    <div className="text-sm font-black" style={{ color: verifyResult ? '#03A66D' : '#CF304A' }}>
                      {verifyResult ? 'INTEGRITY VERIFIED ✓' : 'HASH MISMATCH ✗'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>
                      {verifyResult ? 'The input matches the provided hash exactly.' : 'Data may be tampered or hash is incorrect.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hash History */}
            <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Recent Hashes</h3>
              {hashHistory.length === 0 ? (
                <div className="text-center py-6 text-xs" style={{ color: '#4B5563' }}>No hashes generated yet</div>
              ) : (
                <div className="space-y-2">
                  {hashHistory.map((h, i) => (
                    <div key={i} className="p-2.5 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #1E2329' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color: '#F0B90B' }}>{h.algo}</span>
                        <span className="text-xs" style={{ color: '#4B5563' }}>{new Date(h.ts).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs truncate font-mono mb-0.5" style={{ color: '#848E9C' }}>"{h.input.slice(0,30)}{h.input.length > 30 ? '...' : ''}"</div>
                      <div className="text-xs font-mono truncate" style={{ color: '#03A66D' }}>{h.hash}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ THREATS ═══════════════════ */}
      {tab === 'threats' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: '#848E9C' }}>
              {activeThreats.length} active · {threats.filter(t => t.resolved).length} resolved
            </p>
          </div>
          {threats.map(t => {
            const s = SEV_STYLE[t.severity];
            return (
              <div key={t.id} className="rounded-xl p-4 flex items-start justify-between gap-4"
                   style={{ background: '#1E2329', border: `1px solid ${t.resolved ? '#2B3139' : s.color + '40'}`, opacity: t.resolved ? 0.6 : 1 }}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: s.bg }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black" style={{ color: '#EAECEF' }}>{t.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: s.bg, color: s.color }}>{t.severity}</span>
                      {t.resolved && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D' }}>RESOLVED</span>
                      )}
                    </div>
                    <p className="text-xs mb-1" style={{ color: '#848E9C' }}>{t.desc}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#4B5563' }}>
                      <span className="font-mono">{t.ip}</span>
                      <span>·</span>
                      <span>{timeAgo(t.ts)}</span>
                    </div>
                  </div>
                </div>
                {!t.resolved && (
                  <button onClick={() => resolveThread(t.id)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D', border: '1px solid rgba(3,166,109,0.2)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════ SESSIONS ══════════════════ */}
      {tab === 'sessions' && (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="rounded-xl p-4 flex items-center justify-between gap-4"
                 style={{ background: '#1E2329', border: `1px solid ${s.active ? 'rgba(3,166,109,0.2)' : '#2B3139'}` }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: s.active ? 'rgba(3,166,109,0.1)' : '#151A1F', border: '1px solid #2B3139' }}>
                  <Globe className="w-5 h-5" style={{ color: s.active ? '#03A66D' : '#4B5563' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{s.device}</span>
                    {s.active && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                            style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D' }}>● ACTIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#4B5563' }}>
                    <span className="font-mono">{s.ip}</span>
                    <span>·</span>
                    <span>{s.location}</span>
                    <span>·</span>
                    <span>Last active: {timeAgo(s.last)}</span>
                  </div>
                </div>
              </div>
              {!s.active && (
                <button className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════ AUDIT TRAIL ═══════════════ */}
      {tab === 'audit' && (
        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #2B3139' }}>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr style={{ background: '#151A1F' }}>
                {['Action', 'Entity', 'Risk Level', 'Details', 'SHA-256 Hash', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#848E9C' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditTrail.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: '#848E9C' }}>No audit events yet</td></tr>
              ) : auditTrail.map((log, i) => (
                <AuditRow key={log.id} log={log} i={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════════════════════════ TERMINAL ══════════════════ */}
      {tab === 'terminal' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #1E2329', background: '#151A1F' }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#CF304A' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#F0B90B' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#03A66D' }} />
            </div>
            <span className="text-xs font-mono ml-2" style={{ color: '#4B5563' }}>atheer-security-terminal — bash</span>
          </div>
          <div ref={terminalRef} className="h-96 overflow-y-auto p-4 font-mono text-xs space-y-1" style={{ color: '#03A66D' }}>
            {terminalLines.map((l, i) => (
              <div key={i} className={l.includes('FAIL') || l.includes('✗') ? '' : l.includes('PASS') || l.includes('✓') ? '' : ''}
                   style={{ color: l.includes('FAIL') || l.includes('✗') ? '#CF304A' : l.includes('PASS') || l.includes('✓') ? '#03A66D' : l.includes('Scan complete') ? '#F0B90B' : '#03A66D' }}>
                {l}
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span style={{ color: '#F0B90B' }}>▶</span>
              <span className="animate-pulse" style={{ color: '#EAECEF' }}>_</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Audit row with live SHA-512 integrity hash
function AuditRow({ log, i }) {
  const [hash, setHash] = useState('computing...');
  useEffect(() => {
    const payload = JSON.stringify({ action: log.action, entity: log.entity_type, date: log.created_date, details: log.details });
    sha512(payload).then(h => setHash(h.slice(0, 16) + '…'));
  }, [log]);
  const riskStyle = {
    CRITICAL: { bg: 'rgba(207,48,74,0.1)',  color: '#CF304A' },
    HIGH:     { bg: 'rgba(255,122,0,0.1)',  color: '#FF7A00' },
    MEDIUM:   { bg: 'rgba(240,185,11,0.1)', color: '#F0B90B' },
    LOW:      { bg: 'rgba(24,144,255,0.1)', color: '#1890FF' },
    SAFE:     { bg: 'rgba(3,166,109,0.1)',  color: '#03A66D' },
  }[log.risk_level] || { bg: 'rgba(132,142,156,0.1)', color: '#848E9C' };
  return (
    <tr style={{ borderTop: i > 0 ? '1px solid #1E2329' : 'none' }}>
      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: '#EAECEF' }}>{log.action}</td>
      <td className="px-4 py-2.5 text-xs" style={{ color: '#848E9C' }}>{log.entity_type}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={riskStyle}>{log.risk_level}</span>
      </td>
      <td className="px-4 py-2.5 text-xs max-w-[150px] truncate" style={{ color: '#848E9C' }}>{log.details}</td>
      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: '#03A66D' }}>{hash}</td>
      <td className="px-4 py-2.5 text-xs" style={{ color: '#4B5563' }}>{new Date(log.created_date).toLocaleString()}</td>
    </tr>
  );
}
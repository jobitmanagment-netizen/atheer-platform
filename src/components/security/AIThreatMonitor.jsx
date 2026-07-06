import { useEffect, useMemo, useState } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import {
  Brain, Eye, Ban, RefreshCw, Activity, Radio, Cpu, ChevronRight,
  CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const SEV_STYLE = {
  CRITICAL: { bg: 'rgba(207,48,74,0.12)', color: '#CF304A', glow: 'rgba(207,48,74,0.3)' },
  HIGH: { bg: 'rgba(255,122,0,0.12)', color: '#FF7A00', glow: 'rgba(255,122,0,0.3)' },
  MEDIUM: { bg: 'rgba(240,185,11,0.12)', color: '#F0B90B', glow: 'rgba(240,185,11,0.3)' },
  LOW: { bg: 'rgba(3,166,109,0.12)', color: '#03A66D', glow: 'rgba(3,166,109,0.3)' },
};

const CAT_COLOR = {
  behavioral: '#627EEA',
  pattern: '#CF304A',
  financial: '#F0B90B',
  attack: '#CF304A',
  network: '#8247E5',
  operational: '#03A66D',
};

function inferCategory(alert) {
  const text = `${alert.title || ''} ${alert.message || ''}`.toLowerCase();
  if (text.includes('login') || text.includes('device') || text.includes('session')) return 'behavioral';
  if (text.includes('liquidity') || text.includes('pool')) return 'financial';
  if (text.includes('wallet') || text.includes('cluster')) return 'pattern';
  if (text.includes('ip') || text.includes('network')) return 'network';
  if (text.includes('attack') || text.includes('poison') || text.includes('abuse')) return 'attack';
  return 'operational';
}

function normalizeAlert(alert) {
  const severity = String(alert.severity || alert.risk_level || 'medium').toUpperCase();
  const status = String(alert.status || '').toLowerCase();
  const category = inferCategory(alert);
  return {
    id: alert.id,
    label: alert.title || 'Threat Alert',
    severity: SEV_STYLE[severity] ? severity : 'MEDIUM',
    category,
    aiConf: Number(alert.score || alert.ai_confidence || (severity === 'CRITICAL' ? 98 : severity === 'HIGH' ? 92 : 80)),
    amount_usd: Number(alert.amount_usd || 0),
    ts: new Date(alert.created_date || Date.now()).getTime(),
    blocked: ['blocked', 'quarantined'].includes(status),
    reviewed: ['acknowledged', 'reviewed', 'resolved', 'closed'].includes(status) || !!alert.is_read,
    ai_reasoning: [
      alert.message || 'Persisted alert stored in the local threat feed.',
      alert.recommendation ? `Recommendation: ${alert.recommendation}` : 'Feed synced from current telemetry.',
    ],
    chain: alert.chain || 'ALL',
    tx_count: Number(alert.tx_count || 0),
    status: alert.status || 'active',
    raw: alert,
  };
}

function genTrendData(events) {
  return Array.from({ length: 24 }, (_, h) => {
    const hourEvents = events.filter((e) => new Date(e.ts).getHours() === h);
    return {
      hour: `${h.toString().padStart(2, '0')}h`,
      threats: hourEvents.length,
      blocked: hourEvents.filter((e) => e.blocked).length,
      aiScore: hourEvents.length ? Math.round(hourEvents.reduce((sum, e) => sum + e.aiConf, 0) / hourEvents.length) : 0,
    };
  });
}

function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function AIAnalysisModal({ event, onClose, onBlock, onClear }) {
  const [analyzing, setAnalyzing] = useState(true);
  const [aiReport, setAiReport] = useState('');
  const sev = SEV_STYLE[event.severity];

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const report = await ccs.integrations.Core.InvokeLLM({
          prompt: `You are an AI blockchain security analyst. Analyze this alert and provide a concise technical assessment.

Title: ${event.label}
Severity: ${event.severity}
Confidence: ${event.aiConf}%
Category: ${event.category}
Status: ${event.status}
Created: ${new Date(event.ts).toISOString()}
Signals: ${event.ai_reasoning.join('; ')}

Return threat explanation, risk justification, and the recommended next step.`,
        });
        if (!alive) return;
        setAiReport(typeof report === 'string' ? report : JSON.stringify(report));
      } catch (error) {
        if (!alive) return;
        setAiReport(`Analysis unavailable: ${error?.message || String(error)}`);
      } finally {
        if (alive) setAnalyzing(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [event]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0D1117', border: `1px solid ${sev.color}40` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1E2329', borderBottom: `1px solid ${sev.color}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: sev.bg }}>
              <Brain className="w-4 h-4" style={{ color: sev.color }} />
            </div>
            <div>
              <div className="text-sm font-black" style={{ color: '#EAECEF' }}>AI Threat Analysis</div>
              <div className="text-xs" style={{ color: sev.color }}>{event.label}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#848E9C' }}><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Severity', value: event.severity, color: sev.color },
              { label: 'Confidence', value: `${event.aiConf}%`, color: event.aiConf >= 90 ? '#CF304A' : '#F0B90B' },
              { label: 'Category', value: event.category, color: '#627EEA' },
              { label: 'Status', value: event.status, color: '#848E9C' },
              { label: 'Created', value: new Date(event.ts).toLocaleString(), color: '#848E9C' },
              { label: 'Alert ID', value: event.id, color: '#848E9C' },
            ].map((d) => (
              <div key={d.label} className="p-2.5 rounded-xl" style={{ background: '#151A1F' }}>
                <div className="text-xs mb-0.5" style={{ color: '#4B5563' }}>{d.label}</div>
                <div className="text-xs font-black font-mono" style={{ color: d.color }}>{d.value}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl space-y-1.5" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-3.5 h-3.5" style={{ color: '#627EEA' }} />
              <span className="text-xs font-bold" style={{ color: '#848E9C' }}>Detection Signals</span>
            </div>
            {event.ai_reasoning.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: sev.color }} />
                <span style={{ color: '#EAECEF' }}>{r}</span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl" style={{ background: '#151A1F', border: '1px solid rgba(98,126,234,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5" style={{ color: '#627EEA' }} />
              <span className="text-xs font-bold" style={{ color: '#627EEA' }}>AI Security Report</span>
            </div>
            {analyzing ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: '#848E9C' }}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Analyzing with AI engine...
              </div>
            ) : (
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#EAECEF' }}>{aiReport}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => { await onClear(event.id); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D', border: '1px solid rgba(3,166,109,0.2)' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
              Mark Safe
            </button>
            <button
              onClick={async () => { await onBlock(event.id); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #CF304A, #FF4444)' }}
            >
              <Ban className="w-3.5 h-3.5 inline mr-1.5 text-white" />
              <span className="text-white">Block & Quarantine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIThreatMonitor() {
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterSev, setFilterSev] = useState('ALL');
  const [filterCat, setFilterCat] = useState('ALL');
  const [autoScan, setAutoScan] = useState(true);
  const [scanPulse, setScanPulse] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const rows = await ccs.entities.ThreatAlert.list('-created_date', 50);
      setAlerts((rows || []).map(normalizeAlert));
    } catch (error) {
      logger.error('AIThreatMonitor', 'Failed to load threat alerts', { error: error?.message || String(error) });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadAlerts();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!autoScan) return undefined;
    const interval = setInterval(async () => {
      setScanPulse(true);
      await loadAlerts();
      setTimeout(() => setScanPulse(false), 600);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoScan]);

  const syncFeed = async () => {
    setScanPulse(true);
    try {
      await ccs.functions.invoke('generateThreatAlerts');
      await loadAlerts();
    } catch (error) {
      logger.warn('AIThreatMonitor', 'Threat feed sync failed', { error: error?.message || String(error) });
    } finally {
      setTimeout(() => setScanPulse(false), 600);
    }
  };

  const handleBlock = async (id) => {
    try {
      const current = alerts.find((a) => a.id === id);
      await ccs.entities.ThreatAlert.update(id, { status: 'blocked', is_read: true, updated_date: new Date().toISOString() });
      await ccs.entities.AuditLog.create({
        action: 'BLOCK_THREAT_ALERT',
        entity_type: 'ThreatAlert',
        entity_id: id,
        details: `Alert ${current?.label || id} blocked and quarantined`,
        risk_level: current?.severity || 'HIGH',
        created_date: new Date().toISOString(),
      });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, blocked: true, reviewed: true, status: 'blocked' } : a)));
    } catch (error) {
      logger.error('AIThreatMonitor', 'Failed to block alert', { error: error?.message || String(error) });
    }
  };

  const handleClear = async (id) => {
    try {
      const current = alerts.find((a) => a.id === id);
      await ccs.entities.ThreatAlert.update(id, { status: 'acknowledged', is_read: true, updated_date: new Date().toISOString() });
      await ccs.entities.AuditLog.create({
        action: 'CLEAR_THREAT_ALERT',
        entity_type: 'ThreatAlert',
        entity_id: id,
        details: `Alert ${current?.label || id} marked safe`,
        risk_level: current?.severity || 'LOW',
        created_date: new Date().toISOString(),
      });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, blocked: false, reviewed: true, status: 'acknowledged' } : a)));
    } catch (error) {
      logger.error('AIThreatMonitor', 'Failed to clear alert', { error: error?.message || String(error) });
    }
  };

  const filtered = useMemo(() => alerts.filter((a) => {
    const sevOk = filterSev === 'ALL' || a.severity === filterSev;
    const catOk = filterCat === 'ALL' || a.category === filterCat;
    return sevOk && catOk;
  }), [alerts, filterSev, filterCat]);

  const active = alerts.filter((a) => !a.reviewed);
  const blocked = alerts.filter((a) => a.blocked);
  const criticals = alerts.filter((a) => a.severity === 'CRITICAL' && !a.reviewed);
  const catBreakdown = ['behavioral', 'pattern', 'financial', 'attack', 'network', 'operational'].map((c) => ({
    cat: c,
    count: alerts.filter((a) => a.category === c).length,
    color: CAT_COLOR[c],
  }));
  const trendData = genTrendData(alerts);

  if (loading) {
    return <div className="p-4 text-xs" style={{ color: '#848E9C' }}>Loading threat monitor...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'linear-gradient(135deg, #0D1117 0%, #1a0a0a 100%)', border: '1px solid rgba(207,48,74,0.25)' }}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${scanPulse ? 'scale-110' : ''}`} style={{ background: 'rgba(207,48,74,0.15)', border: `1px solid ${scanPulse ? '#CF304A' : 'rgba(207,48,74,0.3)'}`, boxShadow: scanPulse ? '0 0 20px rgba(207,48,74,0.4)' : 'none', transition: 'all 0.3s' }}>
            <Brain className="w-6 h-6" style={{ color: '#CF304A' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{ color: '#EAECEF' }}>AI Threat Detection Engine</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: 'rgba(3,166,109,0.15)', color: '#03A66D' }}>{autoScan ? '● ACTIVE' : '○ PAUSED'}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Live threat feed backed by persisted alerts and audit history</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="text-lg font-black" style={{ color: '#CF304A' }}>{active.length}</div>
            <div className="text-xs" style={{ color: '#848E9C' }}>Active</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="text-lg font-black" style={{ color: '#F0B90B' }}>{criticals.length}</div>
            <div className="text-xs" style={{ color: '#848E9C' }}>Critical</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="text-lg font-black" style={{ color: '#03A66D' }}>{blocked.length}</div>
            <div className="text-xs" style={{ color: '#848E9C' }}>Blocked</div>
          </div>
          <button onClick={() => setAutoScan((a) => !a)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ background: autoScan ? 'rgba(207,48,74,0.1)' : 'rgba(3,166,109,0.1)', color: autoScan ? '#CF304A' : '#03A66D', border: `1px solid ${autoScan ? 'rgba(207,48,74,0.2)' : 'rgba(3,166,109,0.2)'}` }}>
            {autoScan ? <><Radio className="w-3.5 h-3.5" />Stop AI Scan</> : <><Activity className="w-3.5 h-3.5" />Start AI Scan</>}
          </button>
          <button onClick={syncFeed} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ background: 'rgba(98,126,234,0.12)', color: '#627EEA', border: '1px solid rgba(98,126,234,0.25)' }}>
            <RefreshCw className="w-3.5 h-3.5" />Sync Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Threat Timeline (24h)</h3>
              <p className="text-xs" style={{ color: '#4B5563' }}>AI-detected threats vs blocked actions</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CF304A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#CF304A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#03A66D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#03A66D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#3B4149', fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: '#3B4149', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }} />
              <Area type="monotone" dataKey="threats" stroke="#CF304A" strokeWidth={2} fill="url(#threatGrad)" name="Threats" />
              <Area type="monotone" dataKey="blocked" stroke="#03A66D" strokeWidth={2} fill="url(#blockGrad)" name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#CF304A' }} /><span style={{ color: '#848E9C' }}>Threats Detected</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#03A66D' }} /><span style={{ color: '#848E9C' }}>Auto-Blocked</span></div>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Threat Categories</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={catBreakdown} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="cat" tick={{ fill: '#3B4149', fontSize: 8 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 10 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {catBreakdown.map((c) => <Cell key={c.cat} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#848E9C' }}><Filter className="w-3.5 h-3.5" />Filter:</div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button key={s} onClick={() => setFilterSev(s)} className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all" style={{ background: filterSev === s ? (SEV_STYLE[s]?.bg || '#1E2329') : 'transparent', color: filterSev === s ? (SEV_STYLE[s]?.color || '#EAECEF') : '#848E9C' }}>{s}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
          {['ALL', 'behavioral', 'pattern', 'financial', 'attack', 'network', 'operational'].map((c) => (
            <button key={c} onClick={() => setFilterCat(c)} className="px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all" style={{ background: filterCat === c ? (CAT_COLOR[c] ? `${CAT_COLOR[c]}22` : '#1E2329') : 'transparent', color: filterCat === c ? (CAT_COLOR[c] || '#EAECEF') : '#848E9C' }}>{c}</button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: '#4B5563' }}>{filtered.length} events shown</span>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && <div className="text-center py-12 text-sm" style={{ color: '#848E9C' }}>No threats match current filters</div>}
        {filtered.map((ev) => {
          const sev = SEV_STYLE[ev.severity];
          return (
            <div key={ev.id} className="rounded-xl p-4 transition-all" style={{ background: '#1E2329', border: `1px solid ${ev.reviewed ? '#2B3139' : sev.color + '40'}`, opacity: ev.reviewed ? 0.75 : 1, boxShadow: ev.blocked ? `0 0 16px ${sev.glow}` : 'none', transition: 'all 0.5s' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: sev.bg }}><Brain className="w-4 h-4" style={{ color: sev.color }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black" style={{ color: '#EAECEF' }}>{ev.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.color }}>{ev.severity}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${CAT_COLOR[ev.category]}18`, color: CAT_COLOR[ev.category] }}>{ev.category}</span>
                      {ev.blocked && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>🚫 BLOCKED</span>}
                      {ev.reviewed && !ev.blocked && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D' }}>✓ CLEARED</span>}
                    </div>
                    <div className="flex items-start gap-1.5 mb-2">
                      <Cpu className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#627EEA' }} />
                      <span className="text-xs" style={{ color: '#848E9C' }}>{ev.ai_reasoning[0]}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: '#4B5563' }}>
                      <span className="font-mono">{ev.id}</span>
                      <span>·</span>
                      <span>{timeAgo(ev.ts)}</span>
                      <span>·</span>
                      <span className="font-bold" style={{ color: '#F0B90B' }}>{ev.tx_count} signals</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <svg className="w-10 h-10" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#2B3139" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke={sev.color} strokeWidth="3" strokeDasharray={`${(ev.aiConf / 100) * 87.96} 87.96`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                    </svg>
                    <div style={{ marginTop: -32, marginBottom: 8, textAlign: 'center' }}><div className="text-xs font-black" style={{ color: sev.color }}>{ev.aiConf}%</div></div>
                    <div className="text-xs text-center" style={{ color: '#4B5563', fontSize: 9 }}>AI conf</div>
                  </div>
                  {!ev.reviewed && (
                    <button onClick={() => setSelected(ev)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03]" style={{ background: `${sev.color}18`, color: sev.color, border: `1px solid ${sev.color}40` }}>
                      <Eye className="w-3.5 h-3.5" />Analyze
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && <AIAnalysisModal event={selected} onClose={() => setSelected(null)} onBlock={handleBlock} onClear={handleClear} />}
    </div>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import {
  TrendingUp, Download, RefreshCw, Brain, AlertTriangle,
  Shield, CheckCircle2, FileText, BarChart3, Activity, Filter,
  Zap, ChevronRight, Loader2, X, Package
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const SEV_COLORS = {
  CRITICAL: '#CF304A',
  HIGH: '#FF7A00',
  MEDIUM: '#F0B90B',
  LOW: '#03A66D',
};

const SOURCE_COLORS = {
  AI_ENGINE: '#627EEA',
  ML_MODEL: '#8247E5',
  CHAIN_MONITOR: '#F0B90B',
  COMPLIANCE: '#03A66D',
  THREAT_INTEL: '#CF304A',
};

const CHAIN_COLORS = { ETH: '#627EEA', BNB: '#F0B90B', POLY: '#8247E5', TRON: '#FF0013', ALL: '#848E9C' };

// ── Export helpers ────────────────────────────────────────────────────────────
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RiskTrends() {
  const [alerts, setAlerts] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [filterSev, setFilterSev] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) { setLoading(false); return; }
      const user = await ccs.auth.me();
      const [a, s] = await Promise.all([
        ccs.entities.ThreatAlert.filter({ user_id: [user.id, undefined] }, '-created_date', 100),
        ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 100),
      ]);
      setAlerts(a || []);
      setSwaps(s || []);
    } catch (e) {
      logger.error('RiskTrends', 'Failed to load analytics data', { error: e?.message || String(e) });
    }
    setLoading(false);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await ccs.functions.invoke('generateThreatAlerts', {});
      setScanResult(res.data || res);
      setTimeout(() => loadData(), 1500);
    } catch (e) {
      setScanResult({ error: e.message });
    }
    setScanning(false);
  };

  // ── Derived analytics ───────────────────────────────────────────────────────
  const filtered = useMemo(() => alerts.filter(a => {
    const sevOk = filterSev === 'ALL' || a.severity === filterSev;
    const srcOk = filterSource === 'ALL' || a.source === filterSource;
    return sevOk && srcOk;
  }), [alerts, filterSev, filterSource]);

  const stats = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active');
    const critical = active.filter(a => a.severity === 'CRITICAL');
    const blocked = alerts.filter(a => a.status === 'blocked');
    const avgRisk = alerts.length
      ? Math.round(alerts.reduce((s, a) => s + (a.risk_score || 0), 0) / alerts.length)
      : 0;
    return { active: active.length, critical: critical.length, blocked: blocked.length, avgRisk, total: alerts.length };
  }, [alerts]);

  // Risk trend over time (group by day)
  const riskTrend = useMemo(() => {
    const days = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key.slice(5), alerts: 0, critical: 0, avgRisk: 0, riskScores: [] };
    }
    alerts.forEach(a => {
      const key = (a.created_date || '').slice(0, 10);
      if (days[key]) {
        days[key].alerts++;
        if (a.severity === 'CRITICAL') days[key].critical++;
        days[key].riskScores.push(a.risk_score || 0);
      }
    });
    return Object.values(days).map(d => ({
      ...d,
      avgRisk: d.riskScores.length ? Math.round(d.riskScores.reduce((s, r) => s + r, 0) / d.riskScores.length) : 0,
    }));
  }, [alerts]);

  // Severity distribution
  const sevBreakdown = useMemo(() =>
    Object.keys(SEV_COLORS).map(s => ({
      name: s,
      value: alerts.filter(a => a.severity === s).length,
      color: SEV_COLORS[s],
    })).filter(s => s.value > 0)
  , [alerts]);

  // Source distribution
  const sourceBreakdown = useMemo(() =>
    Object.keys(SOURCE_COLORS).map(s => ({
      name: s,
      count: alerts.filter(a => a.source === s).length,
      color: SOURCE_COLORS[s],
    }))
  , [alerts]);

  // Chain distribution
  const chainBreakdown = useMemo(() => {
    const chains = {};
    alerts.forEach(a => { chains[a.chain || 'ALL'] = (chains[a.chain || 'ALL'] || 0) + 1; });
    return Object.entries(chains).map(([chain, count]) => ({ chain, count, color: CHAIN_COLORS[chain] || '#848E9C' }));
  }, [alerts]);

  // Top alert types
  const topTypes = useMemo(() => {
    const types = {};
    alerts.forEach(a => {
      const t = a.alert_type || 'UNKNOWN';
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [alerts]);

  // ── Export handlers ─────────────────────────────────────────────────────────
  const buildReportData = () => filtered.map(a => ({
    id: a.id,
    type: a.alert_type,
    severity: a.severity,
    source: a.source,
    chain: a.chain,
    message: a.message,
    risk_score: a.risk_score,
    ai_confidence: a.ai_confidence,
    amount_usd: a.amount_usd,
    status: a.status,
    created: a.created_date ? new Date(a.created_date).toISOString() : '',
  }));

  const exportCSV = () => {
    const csv = toCSV(buildReportData());
    downloadFile(`risk-trends-${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
    setShowExport(false);
  };

  const exportJSON = () => {
    downloadFile(`risk-trends-${Date.now()}.json`, JSON.stringify({
      generated_at: new Date().toISOString(),
      summary: stats,
      risk_trend: riskTrend,
      alerts: buildReportData(),
    }, null, 2), 'application/json');
    setShowExport(false);
  };

  const exportBulkReports = async () => {
    // Download all three formats sequentially
    exportCSV();
    await new Promise(r => setTimeout(r, 500));
    exportJSON();
    await new Promise(r => setTimeout(r, 500));
    exportFullReport();
  };

  const exportFullReport = async () => {
    const summary = `ATHEER GLOBAL — RISK TRENDS REPORT
Generated: ${new Date().toLocaleString()}
==============================================

EXECUTIVE SUMMARY
- Total Alerts: ${stats.total}
- Active Threats: ${stats.active}
- Critical (unresolved): ${stats.critical}
- Auto-Blocked: ${stats.blocked}
- Average Risk Score: ${stats.avgRisk}/100

SEVERITY BREAKDOWN
${sevBreakdown.map(s => `  ${s.name}: ${s.value}`).join('\n')}

SOURCE BREAKDOWN
${sourceBreakdown.map(s => `  ${s.name}: ${s.count}`).join('\n')}

CHAIN DISTRIBUTION
${chainBreakdown.map(c => `  ${c.chain}: ${c.count}`).join('\n')}

TOP THREAT TYPES
${topTypes.map((t, i) => `  ${i + 1}. ${t.type} (${t.count})`).join('\n')}

14-DAY RISK TREND
${riskTrend.map(d => `  ${d.date}: ${d.alerts} alerts, ${d.critical} critical, avg risk ${d.avgRisk}`).join('\n')}

==============================================
DETAILED ALERT LOG (${filtered.length} records)
==============================================

${buildReportData().map((a, i) => `
#${i + 1} [${a.severity}] ${a.type}
  Source: ${a.source} | Chain: ${a.chain} | Status: ${a.status}
  Risk Score: ${a.risk_score}/100 | AI Confidence: ${a.ai_confidence}% | Amount: $${a.amount_usd}
  Message: ${a.message}
  Created: ${a.created}
`).join('')}
`;
    downloadFile(`atheer-risk-report-${Date.now()}.txt`, summary, 'text/plain');
    setShowExport(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F0B90B' }} />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(98,126,234,0.12)', border: '1px solid rgba(98,126,234,0.25)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#627EEA' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Risk Trends & Analytics</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Automated threat monitoring · Exportable reports · Real-time risk visualization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}>
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={() => setShowExport(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
            <Download className="w-3.5 h-3.5" />Export Report
          </button>
          <button onClick={runScan} disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #627EEA, #8247E5)' }}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            {scanning ? 'Scanning...' : 'Run AI Scan'}
          </button>
        </div>
      </div>

      {/* Scan result banner */}
      {scanResult && !scanResult.error && (
        <div className="rounded-xl p-3 flex items-center gap-3"
             style={{ background: 'rgba(3,166,109,0.08)', border: '1px solid rgba(3,166,109,0.25)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#03A66D' }} />
          <div className="flex-1 text-xs" style={{ color: '#EAECEF' }}>
            <span className="font-bold" style={{ color: '#03A66D' }}>Scan complete: </span>
            Analyzed {scanResult.analyzed_swaps} swaps & {scanResult.analyzed_logs} logs ·
            Created {scanResult.alerts_created} new alerts · Resolved {scanResult.alerts_resolved} stale ·
            {scanResult.active_alerts_total} active total
          </div>
          <button onClick={() => setScanResult(null)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
        </div>
      )}
      {scanResult?.error && (
        <div className="rounded-xl p-3 flex items-center gap-3"
             style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.25)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#CF304A' }} />
          <span className="text-xs" style={{ color: '#CF304A' }}>Scan failed: {scanResult.error}</span>
          <button onClick={() => setScanResult(null)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Alerts',   value: stats.total,     color: '#627EEA', icon: AlertTriangle },
          { label: 'Active',         value: stats.active,    color: '#FF7A00', icon: Activity },
          { label: 'Critical',       value: stats.critical,  color: '#CF304A', icon: Zap },
          { label: 'Blocked',       value: stats.blocked,   color: '#03A66D', icon: Shield },
          { label: 'Avg Risk Score', value: `${stats.avgRisk}`, color: '#F0B90B', icon: Brain },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${c.color}` }}>
            <c.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: c.color, opacity: 0.08 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{c.label}</p>
            <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Main trend chart */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>14-Day Risk Trend</h3>
            <p className="text-xs" style={{ color: '#4B5563' }}>Daily alerts, critical threats, and average risk score</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#627EEA' }} /><span style={{ color: '#848E9C' }}>Alerts</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#CF304A' }} /><span style={{ color: '#848E9C' }}>Critical</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#F0B90B' }} /><span style={{ color: '#848E9C' }}>Avg Risk</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={riskTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#627EEA" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CF304A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#CF304A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" />
            <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }} />
            <Area type="monotone" dataKey="alerts" stroke="#627EEA" strokeWidth={2} fill="url(#alertGrad)" name="Alerts" />
            <Area type="monotone" dataKey="critical" stroke="#CF304A" strokeWidth={2} fill="url(#critGrad)" name="Critical" />
            <Line type="monotone" dataKey="avgRisk" stroke="#F0B90B" strokeWidth={2} dot={false} name="Avg Risk" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Severity Pie */}
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Severity Distribution</h3>
          {sevBreakdown.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={sevBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                  {sevBreakdown.map(s => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-2">
            {sevBreakdown.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: '#848E9C' }}>{s.name}</span>
                </div>
                <span className="font-black" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source breakdown */}
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Detection Sources</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={sourceBreakdown} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: '#4B5563', fontSize: 8 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, fontSize: 10 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {sourceBreakdown.map(s => <Cell key={s.name} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chain distribution */}
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Chain Distribution</h3>
          {chainBreakdown.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No data</div>
          ) : (
            <div className="space-y-2.5 mt-2">
              {chainBreakdown.map(c => {
                const pct = stats.total ? Math.round((c.count / stats.total) * 100) : 0;
                return (
                  <div key={c.chain}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span style={{ color: '#848E9C' }}>{c.chain}</span>
                      </span>
                      <span className="font-bold" style={{ color: c.color }}>{c.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top threat types + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top types */}
        <div className="rounded-2xl p-5 lg:col-span-1" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Top Threat Types</h3>
          {topTypes.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No threats detected</div>
          ) : (
            <div className="space-y-2">
              {topTypes.map((t, i) => (
                <div key={t.type} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#0D1117' }}>
                  <span className="text-xs font-black w-5 text-center" style={{ color: '#4B5563' }}>#{i + 1}</span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: '#EAECEF' }}>{t.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-black" style={{ color: '#F0B90B' }}>{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert log table */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                <button key={s} onClick={() => setFilterSev(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: filterSev === s ? (SEV_COLORS[s] ? `${SEV_COLORS[s]}18` : '#1E2329') : 'transparent', color: filterSev === s ? (SEV_COLORS[s] || '#EAECEF') : '#848E9C' }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
              {['ALL', 'AI_ENGINE', 'ML_MODEL', 'CHAIN_MONITOR', 'COMPLIANCE', 'THREAT_INTEL'].map(s => (
                <button key={s} onClick={() => setFilterSource(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: filterSource === s ? `${SOURCE_COLORS[s]}18` : 'transparent', color: filterSource === s ? SOURCE_COLORS[s] : '#848E9C' }}>
                  {s.split('_')[0]}
                </button>
              ))}
            </div>
            <span className="text-xs ml-auto" style={{ color: '#4B5563' }}>{filtered.length} alerts</span>
          </div>

          {/* Alert list */}
          <div className="rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: '#848E9C' }}>No alerts match filters</div>
            ) : filtered.map(a => {
              const sev = SEV_COLORS[a.severity] || '#848E9C';
              return (
                <div key={a.id} className="p-3.5 flex items-start gap-3" style={{ borderBottom: '1px solid #1E2329' }}>
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: sev }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-black" style={{ color: '#EAECEF' }}>{a.alert_type?.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${sev}18`, color: sev }}>{a.severity}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${SOURCE_COLORS[a.source]}18`, color: SOURCE_COLORS[a.source] }}>{a.source?.split('_')[0]}</span>
                      {a.status === 'active' && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: sev }} />}
                    </div>
                    <p className="text-xs" style={{ color: '#848E9C' }}>{a.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#4B5563' }}>
                      <span style={{ color: CHAIN_COLORS[a.chain] || '#848E9C' }}>{a.chain}</span>
                      <span>Risk: <b style={{ color: sev }}>{a.risk_score}/100</b></span>
                      <span>AI: <b style={{ color: '#627EEA' }}>{a.ai_confidence}%</b></span>
                      <span>{a.created_date ? new Date(a.created_date).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Export Risk Report</h3>
              <button onClick={() => setShowExport(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
              Export {filtered.length} alerts with full risk analytics. Choose your format:
            </p>
            <div className="space-y-2.5">
              {[
                { label: '⬇️ Download All (Bulk)', desc: 'CSV + JSON + TXT in one click', icon: Package, color: '#CF304A', action: exportBulkReports, primary: true },
                { label: 'Full Text Report', desc: 'Executive summary + detailed alert log', icon: FileText, color: '#627EEA', action: exportFullReport },
                { label: 'CSV Spreadsheet',   desc: 'Structured data for Excel/Sheets',       icon: BarChart3, color: '#03A66D', action: exportCSV },
                { label: 'JSON (Full Data)', desc: 'Complete data with trends & summary',   icon: Activity,  color: '#F0B90B', action: exportJSON },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-80"
                        style={{ background: opt.primary ? `${opt.color}10` : '#0B0E11', border: `1px solid ${opt.color}${opt.primary ? '40' : '25'}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: `${opt.color}18` }}>
                    <opt.icon className="w-4 h-4" style={{ color: opt.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: '#EAECEF' }}>{opt.label}</div>
                    <div className="text-xs" style={{ color: '#848E9C' }}>{opt.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: '#4B5563' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { Shield, Users, AlertTriangle, Activity, Check, X, Eye, Download, BarChart3 } from 'lucide-react';
import RiskBadge from '@/components/ccs/RiskBadge';
import { formatUSD } from '@/lib/ai-risk-engine';
import { RISK_COLORS } from '@/lib/ccs-constants';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import ReportExporter from '@/components/admin/ReportExporter';
import { Link } from 'react-router-dom';

export default function Admin() {
  const [users, setUsers]           = useState([]);
  const [swaps, setSwaps]           = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('overview');
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await ccs.auth.me();
      const profile = await ccs.entities.UserProfile.filter({ user_id: u.id });
      const p = profile?.[0];
      setUserProfile(p);

      if (p?.role !== 'admin') { setLoading(false); return; }

      const [allSwaps, logs, allUsers] = await Promise.all([
        ccs.entities.SwapOrder.list('-created_date', 200),
        ccs.entities.AuditLog.list('-created_date', 200),
        ccs.entities.UserProfile.list('-created_date', 100),
      ]);
      setSwaps(allSwaps || []);
      setAuditLogs(logs || []);
      setUsers(allUsers || []);
      setLoading(false);
    };
    load();
  }, []);

  // Real-time subscription for new high-risk swaps
  useEffect(() => {
    const unsub = ccs.entities.SwapOrder.subscribe((event) => {
      if (event.type === 'create') {
        setSwaps(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setSwaps(prev => prev.map(s => s.id === event.id ? event.data : s));
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#2B3139', borderTopColor: '#F0B90B' }} />
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-16 h-16 mb-4" style={{ color: '#CF304A' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: '#EAECEF' }}>Access Denied</h2>
        <p className="text-sm mb-4" style={{ color: '#848E9C' }}>You need admin privileges to access this panel.</p>
        <Link to="/dashboard" className="px-5 py-2 rounded-lg text-sm font-semibold text-black gold-gradient">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const suspiciousSwaps = swaps.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL');
  const totalVolume     = swaps.reduce((sum, s) => sum + (s.amount_in_usd || 0), 0);
  const highRiskToday   = swaps.filter(s => {
    const today = new Date();
    return (s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL') &&
      new Date(s.created_date).toDateString() === today.toDateString();
  }).length;

  const tabs = [
    { id: 'overview',   label: 'Overview',                            icon: BarChart3 },
    { id: 'stats',      label: 'Statistics',                          icon: Activity },
    { id: 'users',      label: 'Users',                               icon: Users },
    { id: 'suspicious', label: `Suspicious (${suspiciousSwaps.length})`, icon: AlertTriangle },
    { id: 'audit',      label: 'Audit Log',                           icon: Shield },
  ];

  const persistReview = async (actionType) => {
    if (!reviewItem) return;
    setSavingReview(true);
    try {
      const nowIso = new Date().toISOString();
      const patch = {
        review_status: actionType === 'flag' ? 'flagged' : 'reviewed',
        review_note: reviewNote || '',
        reviewed_at: nowIso,
        reviewed_by: userProfile?.id || userProfile?.user_id || 'admin',
        updated_date: nowIso,
        status: actionType === 'flag' ? 'flagged' : reviewItem.status || 'reviewed',
        risk_level: actionType === 'flag' ? 'CRITICAL' : reviewItem.risk_level,
      };
      await ccs.entities.SwapOrder.update(reviewItem.id, patch);
      await ccs.entities.AuditLog.create({
        user_id: userProfile?.user_id || userProfile?.id || 'admin',
        action: actionType === 'flag' ? 'FLAG_SWAP_SUSPICIOUS' : 'MARK_SWAP_REVIEWED',
        entity_type: 'SwapOrder',
        entity_id: reviewItem.id,
        details: `${reviewItem.from_token} → ${reviewItem.to_token} | ${reviewNote || 'No review note provided'}`,
        risk_level: actionType === 'flag' ? 'HIGH' : 'LOW',
        created_date: nowIso,
      });
      setSwaps((prev) => prev.map((s) => (s.id === reviewItem.id ? { ...s, ...patch } : s)));
      setAuditLogs((prev) => [{
        id: `AUD-${Date.now()}`,
        user_id: userProfile?.user_id || userProfile?.id || 'admin',
        action: actionType === 'flag' ? 'FLAG_SWAP_SUSPICIOUS' : 'MARK_SWAP_REVIEWED',
        entity_type: 'SwapOrder',
        entity_id: reviewItem.id,
        details: `${reviewItem.from_token} → ${reviewItem.to_token} | ${reviewNote || 'No review note provided'}`,
        risk_level: actionType === 'flag' ? 'HIGH' : 'LOW',
        created_date: nowIso,
      }, ...prev]);
      setReviewItem(null);
      setReviewNote('');
    } catch (error) {
      logger.error('Admin', 'Failed to persist review action', { error: error?.message || String(error), swapId: reviewItem.id });
      alert('Failed to save review action');
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: '#CF304A' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Admin Panel</h1>
            <p className="text-xs" style={{ color: '#848E9C' }}>Platform monitoring & management</p>
          </div>
        </div>
        <button onClick={() => setShowExport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
          <Download className="w-4 h-4" />
          Export Reports
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',    value: users.length.toString(),    color: '#627EEA', icon: Users },
          { label: 'Total Volume',   value: formatUSD(totalVolume),     color: '#F0B90B', icon: Activity },
          { label: 'High Risk Today',value: highRiskToday.toString(),   color: '#CF304A', icon: AlertTriangle },
          { label: 'Total Swaps',    value: swaps.length.toString(),    color: '#03A66D', icon: Activity },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139', borderLeft: `3px solid ${s.color}` }}>
            <div className="text-xs mb-1" style={{ color: '#848E9C' }}>{s.label}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#151A1F' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tab === t.id ? '#1E2329' : 'transparent',
                    color:      tab === t.id ? '#EAECEF' : '#848E9C',
                    border:     tab === t.id ? '1px solid #2B3139' : '1px solid transparent',
                  }}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Risk Distribution Mini Chart */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="font-semibold mb-4 text-sm" style={{ color: '#EAECEF' }}>Risk Distribution</h3>
            <div className="space-y-2.5">
              {['SAFE','LOW','MEDIUM','HIGH','CRITICAL'].map(level => {
                const count = swaps.filter(s => s.risk_level === level).length;
                const pct   = swaps.length ? (count / swaps.length * 100) : 0;
                const col   = RISK_COLORS[level]?.text;
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: col }}>{level}</span>
                      <span style={{ color: '#848E9C' }}>{count} swaps ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Audit Log */}
          <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="font-semibold mb-4 text-sm" style={{ color: '#EAECEF' }}>Recent Audit Log</h3>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {auditLogs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #2B3139' }}>
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#EAECEF' }}>{log.action}</span>
                    <span className="text-xs ml-2" style={{ color: '#848E9C' }}>{log.entity_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={log.risk_level} size="xs" />
                    <span className="text-xs" style={{ color: '#848E9C' }}>{new Date(log.created_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: '#848E9C' }}>No audit logs yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Statistics Tab ───────────────────────────────────── */}
      {tab === 'stats' && (
        <AdminStatsPanel swaps={swaps} users={users} auditLogs={auditLogs} />
      )}

      {/* ── Users Tab ────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #2B3139' }}>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr style={{ background: '#151A1F' }}>
                {['User', 'KYC Status', 'Role', 'Volume', 'Swaps', 'Avg Risk', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#848E9C' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#848E9C' }}>No users found</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid #2B3139' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold gold-gradient text-black">
                        {(u.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#EAECEF' }}>{u.full_name || 'User'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            background: u.kyc_status === 'verified' ? 'rgba(3,166,109,0.1)' : u.kyc_status === 'pending' ? 'rgba(240,185,11,0.1)' : 'rgba(132,142,156,0.1)',
                            color: u.kyc_status === 'verified' ? '#03A66D' : u.kyc_status === 'pending' ? '#F0B90B' : '#848E9C',
                          }}>
                      {u.kyc_status || 'none'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: u.role === 'admin' ? '#CF304A' : '#848E9C' }}>{u.role}</td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF' }}>{formatUSD(u.total_volume_usd || 0)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>{u.swaps_count || 0}</td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: (u.ai_risk_score_avg || 0) >= 60 ? '#CF304A' : '#848E9C' }}>{u.ai_risk_score_avg || 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>{new Date(u.created_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Suspicious Tab ───────────────────────────────────── */}
      {tab === 'suspicious' && (
        <div className="space-y-3">
          {suspiciousSwaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Check className="w-10 h-10 mb-3" style={{ color: '#03A66D' }} />
              <p className="font-semibold" style={{ color: '#EAECEF' }}>No suspicious activity detected</p>
              <p className="text-sm" style={{ color: '#848E9C' }}>All transactions are within normal risk parameters</p>
            </div>
          ) : suspiciousSwaps.map(swap => (
            <div key={swap.id} className="rounded-xl p-4 flex items-center justify-between"
                 style={{ background: '#1E2329', border: `1px solid ${swap.risk_level === 'CRITICAL' ? 'rgba(207,48,74,0.3)' : 'rgba(255,122,0,0.3)'}` }}>
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: swap.risk_level === 'CRITICAL' ? '#CF304A' : '#FF7A00' }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>
                    {swap.from_token} → {swap.to_token} — {formatUSD(swap.amount_in_usd || 0)}
                  </div>
                  <div className="text-xs" style={{ color: '#848E9C' }}>
                    Score: {swap.risk_score}/100 · {new Date(swap.created_date).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={swap.risk_level} score={swap.risk_score} showScore />
                <button onClick={() => { setReviewItem(swap); setReviewNote(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
                  <Eye className="w-3.5 h-3.5" /> Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Audit Log Tab ────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #2B3139' }}>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr style={{ background: '#151A1F' }}>
                {['Action', 'Entity', 'Risk', 'Details', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#848E9C' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: '#848E9C' }}>No audit logs yet</td></tr>
              ) : auditLogs.map((log, i) => (
                <tr key={log.id} style={{ borderTop: i > 0 ? '1px solid #2B3139' : 'none' }}>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: '#EAECEF' }}>{log.action}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#848E9C' }}>{log.entity_type}</td>
                  <td className="px-4 py-2.5"><RiskBadge level={log.risk_level} size="xs" /></td>
                  <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color: '#848E9C' }}>{log.details}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#848E9C' }}>{new Date(log.created_date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Review Transaction</h3>
              <button onClick={() => setReviewItem(null)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-4">
              {[
                { label: 'Transaction', value: `${reviewItem.from_token} → ${reviewItem.to_token}` },
                { label: 'Amount',      value: formatUSD(reviewItem.amount_in_usd || 0) },
                { label: 'Risk Score',  value: `${reviewItem.risk_score}/100` },
                { label: 'Status',      value: reviewItem.status },
                { label: 'TX Hash',     value: reviewItem.tx_hash ? reviewItem.tx_hash.slice(0, 22) + '...' : 'N/A' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span style={{ color: '#848E9C' }}>{r.label}</span>
                  <span className="font-semibold" style={{ color: '#EAECEF' }}>{r.value}</span>
                </div>
              ))}
              {reviewItem.risk_reasons && (() => {
                try {
                  const reasons = JSON.parse(reviewItem.risk_reasons);
                  return reasons.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium mb-1.5" style={{ color: '#848E9C' }}>Risk Factors:</p>
                      <div className="space-y-1">
                        {reasons.map((r, i) => (
                          <div key={i} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(207,48,74,0.08)', color: '#CF304A' }}>
                            • {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                } catch { return null; }
              })()}
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Review Note</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        rows={3} placeholder="Add review notes..."
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => persistReview('flag')} disabled={savingReview} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                      style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
                Flag Suspicious
              </button>
              <button onClick={() => persistReview('review')} disabled={savingReview} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-60">
                Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <ReportExporter
          swaps={swaps}
          users={users}
          auditLogs={auditLogs}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
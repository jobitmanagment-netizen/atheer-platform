import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { ArrowLeftRight, Droplets, Filter, Download, X, Shield, Info } from 'lucide-react';
import RiskBadge from '@/components/ccs/RiskBadge';
import ChainBadge from '@/components/ccs/ChainBadge';
import { formatUSD } from '@/lib/ai-risk-engine';

const STATUS_COLORS = { pending: '#F0B90B', completed: '#03A66D', failed: '#CF304A', active: '#03A66D', closed: '#848E9C' };

export default function History() {
  const [swaps, setSwaps] = useState([]);
  const [liquidity, setLiquidity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [chainFilter, setChainFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await ccs.auth.me();
        const [s, l] = await Promise.all([
          ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 100),
          ccs.entities.LiquiditySession.filter({ user_id: user.id }, '-created_date', 100),
        ]);
        setSwaps(s || []);
        setLiquidity(l || []);
      } catch (e) {
        logger.error('History', 'Failed to load history', { error: e?.message || String(e) });
        setSwaps([]);
        setLiquidity([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Merge all records
  const allRecords = [
    ...swaps.map(s => ({ ...s, _type: 'Swap' })),
    ...liquidity.map(l => ({ ...l, _type: 'Liquidity' })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filtered = allRecords.filter(r => {
    if (typeFilter !== 'ALL' && r._type !== typeFilter) return false;
    if (chainFilter !== 'ALL') {
      const chain = r.from_chain || r.chain;
      if (chain !== chainFilter) return false;
    }
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && r.risk_level !== riskFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Type', 'Date', 'Details', 'Amount (USD)', 'Status', 'Risk Level'];
    const rows = filtered.map(r => {
      const detail = r._type === 'Swap' ? `${r.from_token} → ${r.to_token}` : r.pool_name;
      const amount = r.amount_in_usd || r.total_value_usd || 0;
      return [r._type, new Date(r.created_date).toLocaleDateString(), detail, amount.toFixed(2), r.status, r.risk_level || 'N/A'];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atheer-history.csv';
    a.click();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Transaction History</h1>
          <p className="text-sm mt-1" style={{ color: '#848E9C' }}>{filtered.length} records</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Type', value: typeFilter, set: setTypeFilter, options: ['ALL', 'Swap', 'Liquidity'] },
          { label: 'Chain', value: chainFilter, set: setChainFilter, options: ['ALL', 'ETH', 'BNB', 'POLY', 'TRON'] },
          { label: 'Status', value: statusFilter, set: setStatusFilter, options: ['ALL', 'pending', 'completed', 'failed', 'active', 'closed'] },
          { label: 'Risk', value: riskFilter, set: setRiskFilter, options: ['ALL', 'SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#848E9C' }}>{f.label}:</span>
            <select value={f.value} onChange={e => f.set(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="atheer-card p-4 animate-pulse h-14">
              <div className="h-4 rounded w-1/3" style={{ background: '#2B3139' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Filter className="w-8 h-8 mb-3" style={{ color: '#2B3139' }} />
          <p className="font-semibold" style={{ color: '#EAECEF' }}>No records found</p>
          <p className="text-sm mt-1" style={{ color: '#848E9C' }}>Try adjusting the filters</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2B3139' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#151A1F' }}>
                {['Type', 'Date', 'Details', 'Amount', 'Chain', 'Status', 'AI Risk', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#848E9C' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isSwap = r._type === 'Swap';
                const detail = isSwap ? `${r.from_token} → ${r.to_token}` : r.pool_name;
                const amount = isSwap ? r.amount_in_usd : r.total_value_usd;
                const chain = r.from_chain || r.chain;
                const statusColor = STATUS_COLORS[r.status] || '#848E9C';
                return (
                  <tr key={r.id} className="transition-all hover:opacity-90" style={{ borderTop: i > 0 ? '1px solid #2B3139' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(30,35,41,0.3)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isSwap ? (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.1)' }}>
                            <ArrowLeftRight className="w-3 h-3 text-gold" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.1)' }}>
                            <Droplets className="w-3 h-3" style={{ color: '#03A66D' }} />
                          </div>
                        )}
                        <span className="text-xs font-medium" style={{ color: '#EAECEF' }}>{r._type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>{new Date(r.created_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: '#EAECEF' }}>{detail}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF' }}>{formatUSD(amount || 0)}</td>
                    <td className="px-4 py-3">{chain && <ChainBadge chain={chain} size="xs" />}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: `${statusColor}18`, color: statusColor }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.risk_level ? <RiskBadge level={r.risk_level} /> : <span className="text-xs" style={{ color: '#848E9C' }}>—</span>}</td>
                    <td className="px-4 py-3">
                      {isSwap && r.risk_level && (
                        <button onClick={() => setDetailItem(r)} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}>
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>AI Risk Analysis</h3>
              </div>
              <button onClick={() => setDetailItem(null)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#848E9C' }}>Transaction</span>
                <span className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{detailItem.from_token} → {detailItem.to_token}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#848E9C' }}>Amount</span>
                <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{formatUSD(detailItem.amount_in_usd)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#848E9C' }}>Risk Level</span>
                <RiskBadge level={detailItem.risk_level} score={detailItem.risk_score} showScore size="md" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#848E9C' }}>Risk Score</span>
                <span className="text-2xl font-black" style={{ color: '#EAECEF' }}>{detailItem.risk_score}/100</span>
              </div>
              {detailItem.risk_reasons && (() => {
                try {
                  const reasons = JSON.parse(detailItem.risk_reasons);
                  return reasons.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#848E9C' }}>RISK FACTORS</p>
                      <ul className="space-y-2">
                        {reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: 'rgba(207,48,74,0.08)', color: '#CF304A' }}>
                            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                } catch { return null; }
              })()}
              <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: '1px solid #2B3139' }}>
                <span style={{ color: '#848E9C' }}>TX Hash</span>
                <span className="font-mono" style={{ color: '#848E9C' }}>{detailItem.tx_hash?.slice(0, 16)}...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
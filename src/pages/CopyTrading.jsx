import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Users, Copy, X, Loader2, Crown, Award, Pause, Play, Trash2 } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';

export default function CopyTrading() {
  const [copies, setCopies] = useState([]);
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [traderLoading, setTraderLoading] = useState(true);
  const [showCopy, setShowCopy] = useState(null);
  const [allocation, setAllocation] = useState('');
  const [copyPercent, setCopyPercent] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState('roi_30d');

  useEffect(() => { loadCopies(); loadTraders(); }, []);

  const loadCopies = async () => {
    setLoading(true);
    try {
      const user = await ccs.auth.me();
      const c = await ccs.entities.CopyTrader.filter({ user_id: user.id }, '-created_date');
      setCopies((c || []).filter(x => x.status === 'active' || x.status === 'paused'));
    } catch (e) { logger.error('CopyTrading', 'Failed to load copy positions', { error: e?.message || String(e) }); }
    setLoading(false);
  };

  const loadTraders = async () => {
    setTraderLoading(true);
    try {
      const res = await ccs.request('/api/copy-trading/traders');
      setTraders(res?.traders || []);
    } catch (e) { logger.error('CopyTrading', 'Failed to load traders', { error: e?.message || String(e) }); }
    setTraderLoading(false);
  };

  const handleCopy = async () => {
    if (!allocation || !showCopy) return;
    setSubmitting(true);
    try {
      const user = await ccs.auth.me();
      await ccs.entities.CopyTrader.create({
        user_id: user.id,
        trader_name: showCopy.name || showCopy.display_name,
        trader_handle: showCopy.handle,
        allocation_usd: parseFloat(allocation),
        copy_percent: copyPercent,
        pnl_usd: 0,
        pnl_percent: 0,
        copied_trades: 0,
        status: 'active',
        trader_roi_30d: showCopy.roi_30d || showCopy.total_pnl || 0,
        trader_followers: showCopy.followers || 0,
      });
      setShowCopy(null);
      setAllocation('');
      setCopyPercent(100);
      await loadCopies();
    } catch (e) { logger.error('CopyTrading', 'Failed to create copy position', { error: e?.message || String(e) }); }
    setSubmitting(false);
  };

  const toggleCopy = async (copy) => {
    await ccs.entities.CopyTrader.update(copy.id, { status: copy.status === 'active' ? 'paused' : 'active' });
    await loadCopies();
  };

  const stopCopy = async (copy) => {
    await ccs.entities.CopyTrader.update(copy.id, { status: 'stopped' });
    await loadCopies();
  };

  const sortedTraders = [...traders].sort((a, b) => b[sort] - a[sort]);
  const totalAllocated = copies.reduce((s, c) => s + c.allocation_usd, 0);
  const totalPnL = copies.reduce((s, c) => s + (c.pnl_usd || 0), 0);

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(98,126,234,0.12)', border: '1px solid rgba(98,126,234,0.25)' }}>
            <Users className="w-5 h-5" style={{ color: '#627EEA' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Copy Trading</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Follow top traders · Automatically copy their strategies</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl px-4 py-2" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>Allocated</div>
            <div className="text-lg font-black" style={{ color: '#EAECEF' }}>{formatUSD(totalAllocated)}</div>
          </div>
          <div className="rounded-xl px-4 py-2" style={{ background: totalPnL >= 0 ? 'rgba(3,166,109,0.08)' : 'rgba(207,48,74,0.08)', border: `1px solid ${totalPnL >= 0 ? 'rgba(3,166,109,0.2)' : 'rgba(207,48,74,0.2)'}` }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>Total PnL</div>
            <div className="text-lg font-black" style={{ color: totalPnL >= 0 ? '#03A66D' : '#CF304A' }}>
              {totalPnL >= 0 ? '+' : ''}{formatUSD(totalPnL)}
            </div>
          </div>
        </div>
      </div>

      {/* My Copies */}
      {copies.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>My Copy Positions</h3>
            <span className="text-xs" style={{ color: '#848E9C' }}>{copies.length} active</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F0B90B' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr style={{ background: '#151A1F' }}>
                    {['Trader', 'Allocation', 'Copy %', 'PnL', 'Trades', 'ROI 30D', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#848E9C' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {copies.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid #1E2329' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: '#F0B90B' }}>
                            {c.trader_name[0]}
                          </div>
                          <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{c.trader_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF' }}>{formatUSD(c.allocation_usd)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>{c.copy_percent}%</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold" style={{ color: (c.pnl_usd || 0) >= 0 ? '#03A66D' : '#CF304A' }}>
                          {(c.pnl_usd || 0) >= 0 ? '+' : ''}{formatUSD(c.pnl_usd || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>{c.copied_trades || 0}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: (c.trader_roi_30d || 0) >= 0 ? '#03A66D' : '#CF304A' }}>
                        {c.trader_roi_30d >= 0 ? '+' : ''}{c.trader_roi_30d?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                              style={{ background: c.status === 'active' ? 'rgba(3,166,109,0.12)' : 'rgba(240,185,11,0.12)', color: c.status === 'active' ? '#03A66D' : '#F0B90B' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />{c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleCopy(c)} className="p-1.5 rounded-lg transition-all hover:opacity-80"
                                  style={{ background: c.status === 'active' ? 'rgba(240,185,11,0.1)' : 'rgba(3,166,109,0.1)', color: c.status === 'active' ? '#F0B90B' : '#03A66D' }}>
                            {c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => stopCopy(c)} className="p-1.5 rounded-lg transition-all hover:opacity-80"
                                  style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Sort by:</span>
        {[
          { id: 'roi_30d', label: 'ROI 30D' },
          { id: 'roi_7d', label: 'ROI 7D' },
          { id: 'followers', label: 'Followers' },
          { id: 'win_rate', label: 'Win Rate' },
          { id: 'aum', label: 'AUM' },
        ].map(s => (
          <button key={s.id} onClick={() => setSort(s.id)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: sort === s.id ? 'rgba(240,185,11,0.12)' : '#1E2329', color: sort === s.id ? '#F0B90B' : '#848E9C', border: `1px solid ${sort === s.id ? 'rgba(240,185,11,0.2)' : '#2B3139'}` }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Trader Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTraders.map((t, idx) => (
          <div key={t.id} className="rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer group"
               style={{ background: '#1E2329', border: '1px solid #2B3139' }}
               onClick={() => setShowCopy(t)}>
            {/* Rank badge */}
            {idx < 3 && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: ['#F0B90B', '#848E9C', '#CD7F32'][idx], boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                {idx === 0 ? <Crown className="w-4 h-4 text-black" /> : <Award className="w-4 h-4 text-black" />}
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-black" style={{ background: t.color }}>
                {t.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold truncate" style={{ color: '#EAECEF' }}>{t.name}</span>
                  {t.verified && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill={t.color}>
                      <path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 16.5L6.5 20L8 13.5L3 9L9.5 8.5L12 2Z" />
                    </svg>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#4B5563' }}>{t.handle}</div>
              </div>
            </div>

            {/* ROI */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: '#0B0E11' }}>
                <div className="text-xs mb-1" style={{ color: '#848E9C' }}>ROI 30D</div>
                <div className="text-xl font-black" style={{ color: t.roi_30d >= 0 ? '#03A66D' : '#CF304A' }}>
                  {t.roi_30d >= 0 ? '+' : ''}{t.roi_30d}%
                </div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: '#0B0E11' }}>
                <div className="text-xs mb-1" style={{ color: '#848E9C' }}>ROI 7D</div>
                <div className="text-xl font-black" style={{ color: t.roi_7d >= 0 ? '#03A66D' : '#CF304A' }}>
                  {t.roi_7d >= 0 ? '+' : ''}{t.roi_7d}%
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span style={{ color: '#848E9C' }}>Win Rate</span>
                <span className="font-bold" style={{ color: t.win_rate >= 70 ? '#03A66D' : '#F0B90B' }}>{t.win_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#848E9C' }}>Followers</span>
                <span className="font-bold" style={{ color: '#EAECEF' }}>{t.followers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#848E9C' }}>Total Trades</span>
                <span className="font-bold" style={{ color: '#EAECEF' }}>{t.total_trades.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#848E9C' }}>AUM</span>
                <span className="font-bold" style={{ color: '#F0B90B' }}>{formatUSD(t.aum)}</span>
              </div>
            </div>

            <div className="w-full py-2.5 rounded-xl text-sm font-black text-center text-black transition-all group-hover:opacity-90 flex items-center justify-center gap-2"
                 style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
              <Copy className="w-4 h-4" /> Copy Trader
            </div>
          </div>
        ))}
      </div>

      {/* Copy Modal */}
      {showCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-black" style={{ background: showCopy.color }}>
                  {showCopy.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-black" style={{ color: '#EAECEF' }}>Copy {showCopy.name}</h3>
                  <p className="text-xs" style={{ color: '#848E9C' }}>ROI 30D: +{showCopy.roi_30d}% · Win Rate: {showCopy.win_rate}%</p>
                </div>
              </div>
              <button onClick={() => setShowCopy(null)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Allocation (USD)</label>
              <input type="number" value={allocation} onChange={e => setAllocation(e.target.value)} placeholder="100.00"
                     className="w-full px-3 py-3 rounded-xl text-sm outline-none font-mono"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#848E9C' }}>Copy Percentage</label>
              <div className="flex items-center gap-3">
                <input type="range" min="10" max="100" value={copyPercent} onChange={e => setCopyPercent(parseInt(e.target.value))}
                       className="flex-1" style={{ accentColor: '#F0B90B' }} />
                <span className="text-lg font-black w-12 text-right" style={{ color: '#F0B90B' }}>{copyPercent}%</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Each trade by {showCopy.name} will be copied at {copyPercent}% of their position size</p>
            </div>

            <div className="space-y-2 mb-5 p-3 rounded-xl" style={{ background: '#0B0E11' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Trader ROI (30D)</span>
                <span className="font-bold" style={{ color: '#03A66D' }}>+{showCopy.roi_30d}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Win Rate</span>
                <span className="font-bold" style={{ color: showCopy.win_rate >= 70 ? '#03A66D' : '#F0B90B' }}>{showCopy.win_rate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Followers</span>
                <span className="font-bold" style={{ color: '#EAECEF' }}>{showCopy.followers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Est. Monthly Return</span>
                <span className="font-bold" style={{ color: '#03A66D' }}>
                  +{allocation ? (parseFloat(allocation) * showCopy.roi_30d / 100).toFixed(2) : '0.00'} USD
                </span>
              </div>
            </div>

            <button onClick={handleCopy} disabled={!allocation || submitting}
                    className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Start Copying ${showCopy.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
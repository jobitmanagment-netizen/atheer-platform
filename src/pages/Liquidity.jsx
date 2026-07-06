import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Plus, TrendingUp, X, Loader2 } from 'lucide-react';
import ChainBadge from '@/components/ccs/ChainBadge';
import { TOKEN_PRICES } from '@/lib/ccs-constants';
import { formatUSD } from '@/lib/ai-risk-engine';

export default function Liquidity() {
  const { userProfile } = useOutletContext() || {};
  const [sessions, setSessions] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSessions = async () => {
    try {
      const user = await ccs.auth.me();
      const s = await ccs.entities.LiquiditySession.filter({ user_id: user.id });
      setSessions(s || []);
    } catch (e) {
      logger.error('Liquidity', 'Failed to load liquidity sessions', { error: e?.message || String(e) });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPools = async () => {
    try {
      const res = await ccs.request('/api/liquidity/pools');
      setPools(res?.pools || []);
    } catch (e) {
      logger.warn('Liquidity', 'Failed to load pools', { error: e?.message });
    }
  };

  useEffect(() => { loadSessions(); loadPools(); }, []);

  const handleAmountAChange = (val) => {
    setAmountA(val);
    if (!selectedPool) return;
    const priceA = TOKEN_PRICES[selectedPool.tokenA] || 1;
    const priceB = TOKEN_PRICES[selectedPool.tokenB] || 1;
    const numA = parseFloat(val) || 0;
    setAmountB((numA * priceA / priceB).toFixed(4));
  };

  const handleAmountBChange = (val) => {
    setAmountB(val);
    if (!selectedPool) return;
    const priceA = TOKEN_PRICES[selectedPool.tokenA] || 1;
    const priceB = TOKEN_PRICES[selectedPool.tokenB] || 1;
    const numB = parseFloat(val) || 0;
    setAmountA((numB * priceB / priceA).toFixed(4));
  };

  const openAdd = (pool) => {
    setSelectedPool(pool);
    setAmountA('');
    setAmountB('');
    setShowAdd(true);
  };

  const totalValueUSD = () => {
    if (!selectedPool) return 0;
    const numA = parseFloat(amountA) || 0;
    const numB = parseFloat(amountB) || 0;
    return numA * (TOKEN_PRICES[selectedPool.tokenA] || 1) + numB * (TOKEN_PRICES[selectedPool.tokenB] || 1);
  };

  const estimatedDailyEarnings = () => {
    if (!selectedPool) return 0;
    return (totalValueUSD() * selectedPool.apy / 100) / 365;
  };

  const sharePercent = () => {
    if (!selectedPool) return 0;
    return Math.min((totalValueUSD() / selectedPool.tvl) * 100, 100);
  };

  const handleAddLiquidity = async () => {
    if (!selectedPool) return;
    setSaving(true);
    const user = await ccs.auth.me();
    const tvl = totalValueUSD();
    const session = await ccs.entities.LiquiditySession.create({
      user_id: user.id,
      pool_name: selectedPool.name,
      token_a: selectedPool.tokenA,
      token_b: selectedPool.tokenB,
      chain: selectedPool.chain,
      amount_a: parseFloat(amountA),
      amount_b: parseFloat(amountB),
      total_value_usd: tvl,
      apy_percent: selectedPool.apy,
      share_percent: parseFloat(sharePercent().toFixed(4)),
      status: 'active',
      earnings_usd: 0,
    });
    await ccs.entities.AuditLog.create({
      user_id: user.id,
      action: 'ADD_LIQUIDITY',
      entity_type: 'LiquiditySession',
      entity_id: session.id,
      details: `Added liquidity to ${selectedPool.name} — ${formatUSD(tvl)}`,
      risk_level: 'SAFE',
    });
    setShowAdd(false);
    setSelectedPool(null);
    loadSessions();
    setSaving(false);
  };

  const handleWithdraw = async (session) => {
    const daysActive = Math.max(1, Math.floor((Date.now() - new Date(session.created_date).getTime()) / 86400000));
    const earnings = (session.total_value_usd * session.apy_percent / 100 / 365) * daysActive;
    await ccs.entities.LiquiditySession.update(session.id, {
      status: 'closed',
      earnings_usd: parseFloat(earnings.toFixed(2)),
      closed_at: new Date().toISOString(),
    });
    loadSessions();
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const closedSessions = sessions.filter(s => s.status === 'closed');
  const totalLiquidity = activeSessions.reduce((sum, s) => sum + (s.total_value_usd || 0), 0);
  const totalEarnings = sessions.reduce((sum, s) => sum + (s.earnings_usd || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Liquidity</h1>
          <p className="text-sm mt-1" style={{ color: '#848E9C' }}>Provide liquidity and earn rewards</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-xs" style={{ color: '#848E9C' }}>Your Liquidity</div>
            <div className="text-lg font-bold text-gold">{formatUSD(totalLiquidity)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: '#848E9C' }}>Total Earnings</div>
            <div className="text-lg font-bold" style={{ color: '#03A66D' }}>{formatUSD(totalEarnings)}</div>
          </div>
        </div>
      </div>

      {/* Pools */}
      <div>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#848E9C' }}>AVAILABLE POOLS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(pools.length > 0 ? pools : []).map(pool => (
            <div key={pool.id} className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
                 style={{ background: pool.isTRC20 ? 'rgba(255,0,19,0.06)' : '#1E2329', border: `1px solid ${pool.isTRC20 ? 'rgba(255,0,19,0.2)' : '#2B3139'}` }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-bold" style={{ color: '#EAECEF' }}>{pool.name}</span>
                    {pool.isTRC20 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,0,19,0.15)', color: '#FF0013', border: '1px solid rgba(255,0,19,0.3)' }}>TRC20</span>
                    )}
                  </div>
                  <ChainBadge chain={pool.chain} size="xs" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: pool.isTRC20 ? '#FF4444' : '#F0B90B' }}>{pool.apy}%</div>
                  <div className="text-xs" style={{ color: '#848E9C' }}>APY</div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#848E9C' }}>TVL</span>
                  <span className="font-semibold" style={{ color: '#EAECEF' }}>{formatUSD(pool.tvl)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#848E9C' }}>Providers</span>
                  <span className="font-semibold" style={{ color: '#EAECEF' }}>{pool.providers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#848E9C' }}>24h Change</span>
                  <span className="font-semibold" style={{ color: pool.change24h >= 0 ? '#03A66D' : '#CF304A' }}>
                    {pool.change24h >= 0 ? '+' : ''}{pool.change24h}%
                  </span>
                </div>
              </div>

              {/* Fill bar */}
              <div className="h-1.5 rounded-full mb-4" style={{ background: '#2B3139' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((pool.tvl / 50000000) * 100, 100)}%`, background: pool.isTRC20 ? '#FF0013' : '#F0B90B' }} />
              </div>

              <button onClick={() => openAdd(pool)}
                      className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${pool.isTRC20 ? '' : 'text-black gold-gradient'}`}
                      style={pool.isTRC20 ? { background: 'rgba(255,0,19,0.15)', border: '1px solid rgba(255,0,19,0.3)', color: '#FF0013' } : {}}>
                <span className="flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Liquidity</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* My Positions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#848E9C' }}>MY ACTIVE POSITIONS</h2>
          <div className="space-y-3">
            {activeSessions.map(session => {
              const daysActive = Math.max(1, Math.floor((Date.now() - new Date(session.created_date).getTime()) / 86400000));
              const earnings = (session.total_value_usd * session.apy_percent / 100 / 365) * daysActive;
              return (
                <div key={session.id} className="rounded-xl p-4 flex items-center justify-between"
                     style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.1)' }}>
                      <TrendingUp className="w-5 h-5" style={{ color: '#03A66D' }} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#EAECEF' }}>{session.pool_name}</div>
                      <div className="text-xs" style={{ color: '#848E9C' }}>
                        {formatUSD(session.total_value_usd)} · {session.apy_percent}% APY · {daysActive}d active
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: '#03A66D' }}>+{formatUSD(earnings)}</div>
                      <div className="text-xs" style={{ color: '#848E9C' }}>Earnings</div>
                    </div>
                    <button onClick={() => handleWithdraw(session)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
                      Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Add Liquidity</h3>
                <p className="text-xs" style={{ color: '#848E9C' }}>{selectedPool.name} Pool</p>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <label className="text-xs mb-2 block" style={{ color: '#848E9C' }}>{selectedPool.tokenA} Amount</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={amountA} onChange={e => handleAmountAChange(e.target.value)}
                         placeholder="0.0" className="flex-1 text-xl font-black bg-transparent outline-none" style={{ color: '#EAECEF' }} />
                  <span className="text-sm font-bold" style={{ color: '#F0B90B' }}>{selectedPool.tokenA}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#848E9C' }}>≈ {formatUSD((parseFloat(amountA) || 0) * (TOKEN_PRICES[selectedPool.tokenA] || 1))}</div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <label className="text-xs mb-2 block" style={{ color: '#848E9C' }}>{selectedPool.tokenB} Amount</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={amountB} onChange={e => handleAmountBChange(e.target.value)}
                         placeholder="0.0" className="flex-1 text-xl font-black bg-transparent outline-none" style={{ color: '#EAECEF' }} />
                  <span className="text-sm font-bold" style={{ color: '#F0B90B' }}>{selectedPool.tokenB}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#848E9C' }}>≈ {formatUSD((parseFloat(amountB) || 0) * (TOKEN_PRICES[selectedPool.tokenB] || 1))}</div>
              </div>

              {(parseFloat(amountA) || 0) > 0 && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(3,166,109,0.05)', border: '1px solid rgba(3,166,109,0.15)' }}>
                  {[
                    { label: 'Total Value', value: formatUSD(totalValueUSD()) },
                    { label: 'Estimated APY', value: `${selectedPool.apy}%`, color: '#03A66D' },
                    { label: 'Est. Daily Earnings', value: formatUSD(estimatedDailyEarnings()), color: '#03A66D' },
                    { label: 'Pool Share', value: `${sharePercent().toFixed(4)}%` },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span style={{ color: '#848E9C' }}>{r.label}</span>
                      <span className="font-bold" style={{ color: r.color || '#EAECEF' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>Cancel</button>
                <button onClick={handleAddLiquidity} disabled={!amountA || saving}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Add Liquidity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
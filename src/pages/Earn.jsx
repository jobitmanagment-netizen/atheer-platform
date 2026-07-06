import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Droplets, Lock, Unlock, X, Loader2 } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';
import { TOKEN_PRICES } from '@/lib/ccs-constants';

const TOKEN_COLORS = {
  USDT: '#F0B90B', BTC: '#F0B90B', ETH: '#627EEA', BNB: '#F0B90B',
};

export default function Earn() {
  const [positions, setPositions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stakeProduct, setStakeProduct] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadPositions(); loadProducts(); }, []);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const user = await ccs.auth.me();
      const p = await ccs.entities.StakingPosition.filter({ user_id: user.id, status: 'active' }, '-created_date');
      setPositions(p || []);
    } catch (e) { logger.error('Earn', 'Failed to load staking positions', { error: e?.message || String(e) }); }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const res = await ccs.request('/api/earn/products');
      const fetched = res?.products || [];
      setProducts(fetched.map(p => ({
        id: p.id,
        token: p.name.includes('BTC') ? 'BTC' : p.name.includes('ETH') ? 'ETH' : p.name.includes('USDT') ? 'USDT' : p.name.includes('BNB') ? 'BNB' : 'USDT',
        apy: p.apr || p.apy || 0,
        lock_days: p.duration_days || 0,
        label: p.duration_days > 0 ? `${p.duration_days} Days` : 'Flexible',
        desc: p.duration_days > 0 ? `Higher APY · Locked` : 'Withdraw anytime',
        min: p.min_amount || 0,
      })));
    } catch (e) { logger.warn('Earn', 'Failed to load products', { error: e?.message || String(e) }); }
  };

  const handleStake = async () => {
    if (!stakeProduct) {
      alert('No staking product selected');
      return;
    }
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    const amount = parseFloat(stakeAmount);
    if (amount < stakeProduct.min) {
      alert(`Minimum amount is ${stakeProduct.min} ${stakeProduct.token}`);
      return;
    }
    setSubmitting(true);
    try {
      const user = await ccs.auth.me();
      if (!user || !user.id) {
        alert('Authentication failed. Please log in again.');
        setSubmitting(false);
        return;
      }
      const tokenPrice = TOKEN_PRICES[stakeProduct.token] || 1;
      const lockUntil = stakeProduct.lock_days > 0
        ? new Date(Date.now() + stakeProduct.lock_days * 86400000).toISOString()
        : null;
      const positionData = {
        user_id: user.id,
        token: stakeProduct.token,
        amount,
        amount_usd: amount * tokenPrice,
        apy_percent: stakeProduct.apy,
        lock_days: stakeProduct.lock_days,
        lock_until: lockUntil,
        rewards_earned: 0,
        status: 'active',
        product_type: stakeProduct.id,
      };
      const newPosition = await ccs.entities.StakingPosition.create(positionData);
      logger.info('Earn', 'Staking position created', { positionId: newPosition?.id, token: stakeProduct.token });
      if (!newPosition || !newPosition.id) {
        throw new Error('Staking position creation returned invalid response');
      }
      try {
        await ccs.entities.AuditLog.create({
          user_id: user.id,
          action: 'STAKE_CREATE',
          entity_type: 'StakingPosition',
          details: `Staked ${amount} ${stakeProduct.token} (${stakeProduct.label})`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('Earn', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      setStakeProduct(null);
      setStakeAmount('');
      await loadPositions();
    } catch (e) {
      logger.error('Earn', 'Staking error', { error: e?.message || String(e) });
      alert('Failed to stake: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnstake = async (pos) => {
    if (!confirm(`Unstake ${pos.amount} ${pos.token}?`)) return;
    try {
      await ccs.entities.StakingPosition.update(pos.id, { status: 'withdrawn' });
      await ccs.entities.AuditLog.create({
        user_id: pos.user_id,
        action: 'STAKE_WITHDRAW',
        entity_type: 'StakingPosition',
        details: `Unstaked ${pos.amount} ${pos.token}`,
        risk_level: 'SAFE',
      });
      await loadPositions();
    } catch (e) {
      logger.error('Earn', 'Unstake error', { error: e?.message || String(e) });
      alert('Failed to unstake. Please try again.');
    }
  };

  const filteredProducts = filter === 'all' ? products : products.filter(p => p.id === filter);

  const totalStaked = positions.reduce((s, p) => s + (p.amount_usd || 0), 0);
  const totalRewards = positions.reduce((s, p) => {
    const days = (Date.now() - new Date(p.created_date).getTime()) / 86400000;
    return s + (p.amount_usd || 0) * (p.apy_percent / 100) * (days / 365);
  }, 0);

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(3,166,109,0.12)', border: '1px solid rgba(3,166,109,0.25)' }}>
            <Droplets className="w-5 h-5" style={{ color: '#03A66D' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Earn & Staking</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Stake your assets · Earn up to 24.1% APY</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl px-4 py-2" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>Total Staked</div>
            <div className="text-lg font-black" style={{ color: '#EAECEF' }}>{formatUSD(totalStaked)}</div>
          </div>
          <div className="rounded-xl px-4 py-2" style={{ background: 'rgba(3,166,109,0.08)', border: '1px solid rgba(3,166,109,0.2)' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>Total Rewards</div>
            <div className="text-lg font-black" style={{ color: '#03A66D' }}>+{formatUSD(totalRewards)}</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#151A1F' }}>
        {[
          { id: 'all', label: 'All Products' },
          { id: 'flexible', label: 'Flexible' },
          { id: 'locked_30', label: '30 Days' },
          { id: 'locked_60', label: '60 Days' },
          { id: 'locked_90', label: '90 Days' },
          { id: 'locked_120', label: '120 Days' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: filter === f.id ? '#1E2329' : 'transparent', color: filter === f.id ? '#F0B90B' : '#848E9C', border: filter === f.id ? '1px solid #2B3139' : '1px solid transparent' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p, i) => (
          <div key={i} className="rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer group"
               style={{ background: '#1E2329', border: '1px solid #2B3139' }}
               onClick={() => setStakeProduct(p)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                     style={{ background: `${TOKEN_COLORS[p.token]}18`, color: TOKEN_COLORS[p.token] }}>
                  {p.token[0]}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: '#EAECEF' }}>{p.token} Staking</div>
                  <div className="text-xs" style={{ color: '#848E9C' }}>{p.label}</div>
                </div>
              </div>
              {p.lock_days > 0 ? <Lock className="w-4 h-4" style={{ color: '#848E9C' }} /> : <Unlock className="w-4 h-4" style={{ color: '#03A66D' }} />}
            </div>

            <div className="mb-4">
              <div className="text-3xl font-black" style={{ color: '#03A66D' }}>{p.apy}%</div>
              <div className="text-xs" style={{ color: '#4B5563' }}>Annual Percentage Yield</div>
            </div>

            <div className="space-y-1.5 text-xs mb-4">
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Min. Amount</span><span className="font-bold" style={{ color: '#EAECEF' }}>{p.min} {p.token}</span></div>
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Lock Period</span><span className="font-bold" style={{ color: '#EAECEF' }}>{p.lock_days === 0 ? 'Flexible' : `${p.lock_days} days`}</span></div>
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Rewards</span><span className="font-bold" style={{ color: '#03A66D' }}>Daily Payout</span></div>
            </div>

            <div className="w-full py-2 rounded-xl text-sm font-bold text-center text-black transition-all group-hover:opacity-90"
                 style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
              Stake Now
            </div>
          </div>
        ))}
      </div>

      {/* Active Positions */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Active Staking Positions</h3>
          <span className="text-xs" style={{ color: '#848E9C' }}>{positions.length} active</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F0B90B' }} /></div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12">
            <Droplets className="w-10 h-10 mx-auto mb-3" style={{ color: '#2B3139' }} />
            <p className="text-sm" style={{ color: '#848E9C' }}>No active staking positions. Choose a product above to start earning.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: '#151A1F' }}>
                  {['Token', 'Type', 'Amount', 'Staked Value', 'APY', 'Est. Rewards', 'Lock Until', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#848E9C' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const days = (Date.now() - new Date(pos.created_date).getTime()) / 86400000;
                  const rewards = (pos.amount_usd || 0) * (pos.apy_percent / 100) * (days / 365);
                  const isLocked = pos.lock_until && new Date(pos.lock_until) > new Date();
                  return (
                    <tr key={pos.id} style={{ borderTop: '1px solid #1E2329' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                               style={{ background: `${TOKEN_COLORS[pos.token]}18`, color: TOKEN_COLORS[pos.token] }}>{pos.token[0]}</div>
                          <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{pos.token}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: pos.lock_days > 0 ? 'rgba(240,185,11,0.12)' : 'rgba(3,166,109,0.12)', color: pos.lock_days > 0 ? '#F0B90B' : '#03A66D' }}>
                          {pos.lock_days === 0 ? 'Flexible' : `${pos.lock_days}D`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#EAECEF' }}>{pos.amount} {pos.token}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF' }}>{formatUSD(pos.amount_usd)}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#03A66D' }}>{pos.apy_percent}%</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: '#03A66D' }}>+{formatUSD(rewards)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#848E9C' }}>
                        {pos.lock_until ? (isLocked ? new Date(pos.lock_until).toLocaleDateString() : 'Unlocked') : 'Flexible'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleUnstake(pos)} disabled={isLocked}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
                                style={{ background: isLocked ? 'rgba(132,142,156,0.08)' : 'rgba(207,48,74,0.1)', color: isLocked ? '#848E9C' : '#CF304A', border: '1px solid #2B3139' }}>
                          {isLocked ? 'Locked' : 'Unstake'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stake Modal */}
      {stakeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                     style={{ background: `${TOKEN_COLORS[stakeProduct.token]}18`, color: TOKEN_COLORS[stakeProduct.token] }}>
                  {stakeProduct.token[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black" style={{ color: '#EAECEF' }}>Stake {stakeProduct.token}</h3>
                  <p className="text-xs" style={{ color: '#848E9C' }}>{stakeProduct.label} · {stakeProduct.apy}% APY</p>
                </div>
              </div>
              <button onClick={() => setStakeProduct(null)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Amount ({stakeProduct.token})</label>
              <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)}
                     placeholder={`Min: ${stakeProduct.min}`}
                     className="w-full px-3 py-3 rounded-xl text-sm outline-none font-mono"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>

            <div className="space-y-2 mb-5 p-3 rounded-xl" style={{ background: '#0B0E11' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>APY</span>
                <span className="font-bold" style={{ color: '#03A66D' }}>{stakeProduct.apy}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Lock Period</span>
                <span className="font-bold" style={{ color: '#EAECEF' }}>{stakeProduct.lock_days === 0 ? 'Flexible' : `${stakeProduct.lock_days} days`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Daily Rewards</span>
                <span className="font-bold" style={{ color: '#03A66D' }}>
                  +{stakeAmount ? (parseFloat(stakeAmount) * (TOKEN_PRICES[stakeProduct.token] || 1) * stakeProduct.apy / 100 / 365).toFixed(4) : '0.00'} USD
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#848E9C' }}>Monthly Rewards</span>
                <span className="font-bold" style={{ color: '#03A66D' }}>
                  +{stakeAmount ? (parseFloat(stakeAmount) * (TOKEN_PRICES[stakeProduct.token] || 1) * stakeProduct.apy / 100 / 12).toFixed(4) : '0.00'} USD
                </span>
              </div>
            </div>

            <button onClick={handleStake} disabled={!stakeAmount || submitting}
                    className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #03A66D, #04D484)' }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Stake ${stakeProduct.token}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { BarChart3, TrendingUp, Target, Shield, PieChart as PieChartIcon, Activity, AlertTriangle, Wallet } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';
import { CHAIN_COLORS } from '@/lib/ccs-constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts';

export default function PortfolioPro() {
  const { userProfile } = useOutletContext() || {};
  const [wallets, setWallets] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [staking, setStaking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await ccs.auth.me();
        const [w, s, st] = await Promise.all([
          ccs.entities.Wallet.filter({ user_id: user.id }),
          ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 50),
          ccs.entities.StakingPosition.filter({ user_id: user.id, status: 'active' }),
        ]);
        setWallets(w || []); setSwaps(s || []); setStaking(st || []);
      } catch (e) { logger.error('PortfolioPro', 'Failed to load portfolio data', { error: e?.message || String(e) }); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const totalValue = wallets.reduce((s, w) => s + (w.balance_usd || 0), 0);
  const totalInitial = wallets.reduce((s, w) => s + (w.initial_balance_usd || w.balance_usd || 0), 0);
  const totalPnL = totalValue - totalInitial;
  const pnlPct = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const stakingValue = staking.reduce((s, p) => s + (p.amount_usd || 0), 0);
  const stakingRewards = staking.reduce((s, p) => s + (p.rewards_earned || 0), 0);

  const allocation = wallets.map(w => ({ name: w.chain, value: w.balance_usd || 0, color: CHAIN_COLORS[w.chain] || '#F0B90B' }))
    .filter(a => a.value > 0);

  const diversificationScore = allocation.length > 0 ? Math.min(100, (allocation.length / 5) * 100) : 0;
  const largestPosition = allocation.length > 0 ? Math.max(...allocation.map(a => a.value)) : 0;
  const concentrationRisk = totalValue > 0 ? (largestPosition / totalValue) * 100 : 0;

  const returns = swaps.map(s => s.amount_in_usd || 0).filter(v => v > 0);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0 ? returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev).toFixed(2) : '0.00';
  const maxDrawdown = pnlPct < 0 ? Math.abs(pnlPct).toFixed(1) : '0.0';

  const pnlHistory = [];
  let cumulative = totalInitial;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const daySwaps = swaps.filter(s => new Date(s.created_date).toDateString() === d.toDateString());
    const dayPnL = daySwaps.reduce((sum, s) => sum + (s.amount_in_usd || 0) * 0.02, 0);
    cumulative += dayPnL;
    pnlHistory.push({ date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: cumulative });
  }

  const suggestions = [];
  if (concentrationRisk > 50) suggestions.push({ text: `Reduce ${allocation[0]?.name || ''} concentration — ${concentrationRisk.toFixed(0)}% in single asset`, risk: 'HIGH' });
  if (diversificationScore < 40) suggestions.push({ text: 'Diversify across more chains to reduce risk', risk: 'MEDIUM' });
  if (stakingValue < totalValue * 0.2) suggestions.push({ text: 'Consider allocating more to staking for passive income', risk: 'LOW' });
  if (pnlPct < 0) suggestions.push({ text: 'Portfolio is in loss — review your trading strategy', risk: 'HIGH' });
  if (suggestions.length === 0) suggestions.push({ text: 'Portfolio is well-balanced. Keep up the good work!', risk: 'LOW' });

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />)}
    </div>
  );

  const riskColor = (risk) => risk === 'HIGH' ? '#CF304A' : risk === 'MEDIUM' ? '#F0B90B' : '#03A66D';

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#627EEA' }} />
          <h1 className="text-xl font-black" style={{ color: '#EAECEF' }}>Portfolio Pro</h1>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse"
              style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Value', value: formatUSD(totalValue), sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#03A66D' : '#CF304A', icon: Wallet },
          { label: 'Total P&L', value: formatUSD(totalPnL), sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#03A66D' : '#CF304A', icon: TrendingUp },
          { label: 'Sharpe Ratio', value: sharpeRatio, sub: 'Risk-adjusted return', color: '#627EEA', icon: Activity },
          { label: 'Max Drawdown', value: `${maxDrawdown}%`, sub: 'Worst decline', color: '#CF304A', icon: AlertTriangle },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${k.color}` }}>
            <k.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: k.color, opacity: 0.1 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Portfolio Value History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={pnlHistory} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#627EEA" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#627EEA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} interval={7} />
              <YAxis tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }}
                       formatter={v => [formatUSD(v), 'Value']} />
              <Area type="monotone" dataKey="value" stroke="#627EEA" strokeWidth={2} fill="url(#pnlGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Diversification Score</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={140}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: diversificationScore, fill: diversificationScore >= 60 ? '#03A66D' : diversificationScore >= 40 ? '#F0B90B' : '#CF304A' }]}
                              startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: '#1A1F26' }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color: '#EAECEF' }}>{diversificationScore.toFixed(0)}</span>
              <span className="text-xs" style={{ color: '#848E9C' }}>/ 100</span>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: '#848E9C' }}>Assets</span>
              <span className="font-bold" style={{ color: '#EAECEF' }}>{allocation.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#848E9C' }}>Largest position</span>
              <span className="font-bold" style={{ color: concentrationRisk > 50 ? '#CF304A' : '#03A66D' }}>{concentrationRisk.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#848E9C' }}>Staking</span>
              <span className="font-bold" style={{ color: '#03A66D' }}>{formatUSD(stakingValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Asset Allocation</h3>
          </div>
          {allocation.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={allocation} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {allocation.map(a => <Cell key={a.name} fill={a.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }}
                           formatter={v => [formatUSD(v), 'Value']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {allocation.map(a => {
                  const pct = totalValue > 0 ? ((a.value / totalValue) * 100).toFixed(1) : 0;
                  return (
                    <div key={a.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                        <span style={{ color: '#848E9C' }}>{a.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: '#EAECEF' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wallet className="w-8 h-8 mb-2" style={{ color: '#2B3139' }} />
              <p className="text-sm" style={{ color: '#4B5563' }}>No wallets yet</p>
              <Link to="/wallets" className="mt-3 text-xs px-3 py-1.5 rounded-lg font-bold text-black gold-gradient">Add Wallet</Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#8247E5' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>AI Rebalancing Suggestions</h3>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                   style={{ background: '#151A1F', border: `1px solid ${riskColor(s.risk)}22` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: `${riskColor(s.risk)}18`, color: riskColor(s.risk) }}>
                  <Shield className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: '#EAECEF' }}>{s.text}</p>
                  <span className="text-xs font-bold" style={{ color: riskColor(s.risk) }}>{s.risk} RISK</span>
                </div>
              </div>
            ))}
          </div>
          {stakingValue > 0 && (
            <div className="mt-3 p-3 rounded-xl flex items-center justify-between"
                 style={{ background: 'rgba(3,166,109,0.08)', border: '1px solid rgba(3,166,109,0.15)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: '#03A66D' }}>Staking Rewards</p>
                <p className="text-xs" style={{ color: '#848E9C' }}>{staking.length} active positions</p>
              </div>
              <p className="text-lg font-black" style={{ color: '#03A66D' }}>+{formatUSD(stakingRewards)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
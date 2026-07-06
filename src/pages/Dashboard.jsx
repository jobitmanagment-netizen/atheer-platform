import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { useAuth } from '@/context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, ArrowLeftRight, TrendingUp, DollarSign, Shield, Activity, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Droplets } from 'lucide-react';
import RiskBadge from '@/components/ccs/RiskBadge';
import ChainBadge from '@/components/ccs/ChainBadge';
import CandlestickChart from '@/components/ccs/CandlestickChart';
import LiveTickerBar from '@/components/ccs/LiveTickerBar';
import { logger } from '@/lib/logger';
import { formatUSD } from '@/lib/ai-risk-engine';
import { CHAIN_COLORS } from '@/lib/ccs-constants';

// Build a real 30-day trading-volume series from the user's own swap history.
function buildVolumeSeries(swaps) {
  const days = [];
  const byDay = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = 0;
    days.push({ key, date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) });
  }
  swaps.forEach(s => {
    const key = new Date(s.created_date).toISOString().slice(0, 10);
    if (key in byDay) byDay[key] += s.amount_in_usd || 0;
  });
  return days.map(d => ({ date: d.date, volume: Math.round(byDay[d.key]) }));
}

const LIVE_TOKENS = ['BTC', 'ETH', 'BNB', 'TRX', 'SOL', 'AVAX', 'ADA', 'DOGE', 'MATIC', 'LINK'];

export default function Dashboard() {
  const { userProfile } = useOutletContext() || {};
  const { user } = useAuth();
  const [wallets, setWallets]   = useState([]);
  const [swaps, setSwaps]       = useState([]);
  const [liquidity, setLiquidity] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [volumeData, setVolumeData] = useState([]);
  const [volumeRange, setVolumeRange] = useState('1M');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const uid = user.uid;

    const load = async () => {
      try {
        const [w, s, allSwaps, l, mkt] = await Promise.all([
          ccs.entities.Wallet.filter({ user_id: uid }),
          ccs.entities.SwapOrder.filter({ user_id: uid }, '-created_date', 8),
          ccs.entities.SwapOrder.filter({ user_id: uid }, '-created_date', 500),
          ccs.entities.LiquiditySession.filter({ user_id: uid, status: 'active' }),
          ccs.functions.invoke('getLiveMarketData', { token: 'BTC', days: '1' }),
        ]);
        setWallets(w || []); setSwaps(s || []); setLiquidity(l || []);
        setVolumeData(buildVolumeSeries(allSwaps || []));
        setMarketData(mkt?.data || mkt);
      } catch (e) { logger.error('Dashboard', 'Failed to load dashboard data', { error: e?.message || String(e) }); }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(async () => {
      try {
        const mkt = await ccs.functions.invoke('getLiveMarketData', { token: 'BTC', days: '1' });
        setMarketData(mkt?.data || mkt);
      } catch (e) { logger.warn('Dashboard', 'Market refresh failed', { error: e?.message || String(e) }); }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const totalBalanceUSD = wallets.reduce((s, w) => s + (w.balance_usd || 0), 0);
  const trc20Balance    = wallets.filter(w => w.chain === 'TRON').reduce((s, w) => s + (w.balance_usd || 0), 0);
  const activeWallets   = wallets.filter(w => w.is_active).length;
  const chainDist = Object.entries(wallets.reduce((acc, w) => {
    acc[w.chain] = (acc[w.chain] || 0) + (w.balance_usd || 0); return acc;
  }, {})).map(([chain, value]) => ({ chain, value }));

  const aiScore = userProfile?.ai_risk_score_avg || 12;
  const aiLevel = aiScore >= 80 ? 'CRITICAL' : aiScore >= 60 ? 'HIGH' : aiScore >= 40 ? 'MEDIUM' : aiScore >= 20 ? 'LOW' : 'SAFE';
  const aiColor = aiScore >= 60 ? '#CF304A' : aiScore >= 40 ? '#F0B90B' : '#03A66D';
  const volumeChartData = volumeRange === '1D'
    ? volumeData.slice(-1)
    : volumeRange === '1W'
      ? volumeData.slice(-7)
      : volumeData;
  const volumeSubtitle = volumeRange === '1D'
    ? 'Last 24 hours (USD)'
    : volumeRange === '1W'
      ? 'Last 7 days (USD)'
      : 'Last 30 days (USD)';

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />
      ))}
    </div>
  );

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* ── Live Markets Ticker ──────────────────────────────── */}
      <LiveTickerBar />

      {/* ── Hero Balance Banner ──────────────────────────────── */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1a1f26 0%, #0f1419 50%, #0d1117 100%)', border: '1px solid #1E2329' }}>
        {/* decorative */}
        <div className="absolute right-0 top-0 w-80 h-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at right, rgba(240,185,11,0.06) 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium" style={{ color: '#848E9C' }}>Total Balance</span>
                <button onClick={() => setHideBalance(h => !h)} style={{ color: '#4B5563' }}>
                  {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-4xl font-black tracking-tight" style={{ color: '#EAECEF', fontFamily: 'Inter, monospace' }}>
                {hideBalance ? '••••••' : formatUSD(totalBalanceUSD)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {(() => {
                  const totalInitial = wallets.reduce((s, w) => s + (w.initial_balance_usd || w.balance_usd || 0), 0);
                  const pnl = totalBalanceUSD - totalInitial;
                  const pct = totalInitial > 0 ? (pnl / totalInitial) * 100 : 0;
                  return (
                    <span className="text-sm font-bold" style={{ color: pnl >= 0 ? '#03A66D' : '#CF304A' }}>
                      {pnl >= 0 ? '▲' : '▼'} {pnl >= 0 ? '+' : ''}{formatUSD(pnl)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                    </span>
                  );
                })()}
                <span className="text-xs" style={{ color: '#4B5563' }}>All time PnL</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs mb-1" style={{ color: '#848E9C' }}>USDT TRC20</div>
              <div className="text-2xl font-black" style={{ color: '#FF4444', fontFamily: 'monospace' }}>
                {hideBalance ? '••••' : formatUSD(trc20Balance)}
              </div>
              <div className="text-xs mt-1 font-bold px-2 py-0.5 rounded inline-block"
                   style={{ background: 'rgba(255,0,19,0.12)', color: '#FF0013' }}>TRC20 TRON</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { icon: ArrowDownLeft, label: 'Deposit',  color: '#03A66D', to: '/wallets' },
              { icon: ArrowUpRight,  label: 'Withdraw', color: '#CF304A', to: '/wallets' },
              { icon: ArrowLeftRight,label: 'Trade',    color: '#F0B90B', to: '/swap'    },
              { icon: TrendingUp,    label: 'Earn',     color: '#627EEA', to: '/liquidity'},
            ].map(a => (
              <Link key={a.label} to={a.to}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                    style={{ background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}22` }}>
                <a.icon className="w-3.5 h-3.5" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4 KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Portfolio Value', value: hideBalance ? '••••' : formatUSD(totalBalanceUSD), sub: '+2.34% today', color: '#F0B90B', icon: DollarSign, up: true },
          { label: 'Active Wallets',  value: `${activeWallets}/${wallets.length}`, sub: 'wallets online', color: '#627EEA', icon: Wallet, up: null },
          { label: 'Total Swaps',     value: userProfile?.swaps_count || '0', sub: 'all time trades', color: '#03A66D', icon: ArrowLeftRight, up: true },
          { label: 'AI Risk Score',   value: `${aiScore}/100`, sub: aiLevel, color: aiColor, icon: Shield, up: aiScore < 40 },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${k.color}` }}>
            <div className="absolute right-3 top-3 opacity-8">
              <k.icon className="w-10 h-10" style={{ color: k.color, opacity: 0.1 }} />
            </div>
            <p className="text-xs font-medium mb-2" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: k.up === null ? '#848E9C' : k.up ? '#03A66D' : '#CF304A' }}>
              {k.up !== null ? (k.up ? '▲' : '▼') : '•'} {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Live Professional Chart ────────────────────────── */}
      <CandlestickChart defaultToken="BTC" />

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Trading Volume</h3>
              <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{volumeSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {['1D','1W','1M'].map((p) => {
                const active = volumeRange === p;
                return (
                <button key={p} onClick={() => setVolumeRange(p)} className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all"
                        style={{ background: active ? 'rgba(240,185,11,0.12)' : '#151A1F', color: active ? '#F0B90B' : '#848E9C', border: active ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139' }}>
                  {p}
                </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={volumeChartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F0B90B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} interval={7} />
              <YAxis tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }}
                       formatter={v => [`$${v.toLocaleString()}`, 'Volume']} />
              <Area type="monotone" dataKey="volume" stroke="#F0B90B" strokeWidth={2} fill="url(#volGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Distribution */}
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Asset Allocation</h3>
          <p className="text-xs mb-4" style={{ color: '#4B5563' }}>By network</p>
          {chainDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={chainDist} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={4}>
                    {chainDist.map(e => <Cell key={e.chain} fill={CHAIN_COLORS[e.chain] || '#F0B90B'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }}
                           formatter={v => [formatUSD(v), 'Value']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {chainDist.map(d => {
                  const pct = totalBalanceUSD ? ((d.value / totalBalanceUSD) * 100).toFixed(1) : 0;
                  return (
                    <div key={d.chain} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: CHAIN_COLORS[d.chain] }} />
                        <span style={{ color: '#848E9C' }}>{d.chain}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold" style={{ color: '#EAECEF' }}>{formatUSD(d.value)}</span>
                        <span style={{ color: '#4B5563' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <Wallet className="w-8 h-8 mb-2" style={{ color: '#2B3139' }} />
              <p className="text-sm mb-3" style={{ color: '#4B5563' }}>No wallets yet</p>
              <Link to="/wallets" className="text-xs px-3 py-1.5 rounded-lg font-bold text-black gold-gradient">Add Wallet</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Market Overview + Recent Transactions ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Market Prices */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Market</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse"
                  style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
          </div>
          <div>
            {/* Header row */}
            <div className="grid grid-cols-3 px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ color: '#3B4149', borderBottom: '1px solid #1E2329' }}>
              <span>Asset</span><span className="text-right">Price</span><span className="text-right">24h</span>
            </div>
            {LIVE_TOKENS.map(sym => {
              const price = marketData?.prices?.[sym] || 0;
              const change = marketData?.changes?.[sym] || 0;
              return (
                <div key={sym} className="grid grid-cols-3 px-5 py-3 text-xs items-center hover:opacity-80 transition-all cursor-pointer"
                     style={{ borderBottom: '1px solid #1A1F26' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                         style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }}>{sym[0]}</div>
                    <div>
                      <div className="font-bold" style={{ color: '#EAECEF' }}>{sym}</div>
                      <div style={{ color: '#3B4149', fontSize: 9 }}>{marketData?.volumes?.[sym] ? formatUSD(marketData.volumes[sym]) : '—'}</div>
                    </div>
                  </div>
                  <div className="text-right font-bold" style={{ color: '#EAECEF' }}>
                    ${price < 1 ? price.toFixed(5) : price.toLocaleString()}
                  </div>
                  <div className="text-right font-bold" style={{ color: change >= 0 ? '#03A66D' : '#CF304A' }}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3">
            <Link to="/swap" className="block w-full text-center py-2 rounded-xl text-xs font-bold text-black gold-gradient">
              Trade Now →
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Recent Transactions</h3>
            <Link to="/history" className="text-xs font-semibold transition-all hover:opacity-80" style={{ color: '#F0B90B' }}>View All</Link>
          </div>

          {swaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="w-10 h-10 mb-3" style={{ color: '#2B3139' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: '#EAECEF' }}>No transactions yet</p>
              <p className="text-xs mb-4" style={{ color: '#4B5563' }}>Start trading to see your history</p>
              <Link to="/swap" className="px-5 py-2 rounded-xl text-xs font-bold text-black gold-gradient">Start Trading</Link>
            </div>
          ) : (
            <div>
              <div className="grid px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                   style={{ color: '#3B4149', borderBottom: '1px solid #1E2329', gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <span>Pair</span><span className="text-right">Amount</span><span className="text-right">Risk</span><span className="text-right">Status</span>
              </div>
              {swaps.map(swap => (
                <div key={swap.id} className="grid px-5 py-3 items-center hover:opacity-80 transition-all text-xs"
                     style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid #1A1F26' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                         style={{ background: 'rgba(240,185,11,0.08)' }}>
                      <ArrowLeftRight className="w-3 h-3" style={{ color: '#F0B90B' }} />
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: '#EAECEF' }}>{swap.from_token}/{swap.to_token}</div>
                      <div style={{ color: '#3B4149', fontSize: 10 }}>{new Date(swap.created_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right font-bold" style={{ color: '#EAECEF' }}>{formatUSD(swap.amount_in_usd || 0)}</div>
                  <div className="flex justify-end"><RiskBadge level={swap.risk_level} size="xs" /></div>
                  <div className="flex justify-end">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs"
                          style={{
                            background: swap.status === 'completed' ? 'rgba(3,166,109,0.12)' : swap.status === 'pending' ? 'rgba(240,185,11,0.12)' : 'rgba(207,48,74,0.12)',
                            color: swap.status === 'completed' ? '#03A66D' : swap.status === 'pending' ? '#F0B90B' : '#CF304A',
                          }}>
                      {swap.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Score + Liquidity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Risk */}
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: aiColor }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>AI Risk Monitor</h3>
          </div>
          <div className="flex items-center gap-5">
            {/* Ring */}
            <div className="relative flex-shrink-0">
              <svg className="w-20 h-20" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1A1F26" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={aiColor} strokeWidth="10"
                        strokeDasharray={`${(aiScore/100)*251.2} 251.2`} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black" style={{ color: '#EAECEF' }}>{aiScore}</span>
                <span className="text-xs" style={{ color: '#4B5563' }}>/100</span>
              </div>
            </div>
            <div className="flex-1">
              <RiskBadge level={aiLevel} size="md" />
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#848E9C' }}>
                Average across all your transactions
              </p>
              <div className="mt-2 space-y-1">
                {[['Transactions', userProfile?.swaps_count || 0],['Volume', formatUSD(userProfile?.total_volume_usd||0)]].map(([k,v])=>(
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color: '#4B5563' }}>{k}</span>
                    <span className="font-semibold" style={{ color: '#EAECEF' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Liquidity */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: '#03A66D' }} />
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Active Earning Positions</h3>
            </div>
            <Link to="/liquidity" className="text-xs font-semibold" style={{ color: '#F0B90B' }}>+ Add Liquidity</Link>
          </div>
          {liquidity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <TrendingUp className="w-8 h-8 mb-2" style={{ color: '#2B3139' }} />
              <p className="text-sm mb-1" style={{ color: '#EAECEF' }}>No active positions</p>
              <p className="text-xs mb-3" style={{ color: '#4B5563' }}>Earn up to 24.1% APY on liquidity pools</p>
              <Link to="/liquidity" className="px-4 py-1.5 rounded-xl text-xs font-bold text-black gold-gradient">Start Earning</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {liquidity.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ background: 'rgba(3,166,109,0.1)' }}>
                      <Droplets className="w-4 h-4" style={{ color: '#03A66D' }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#EAECEF' }}>{l.pool_name}</div>
                      <ChainBadge chain={l.chain} size="xs" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black" style={{ color: '#03A66D' }}>+{l.apy_percent}% APY</div>
                    <div className="text-xs" style={{ color: '#848E9C' }}>{formatUSD(l.total_value_usd || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
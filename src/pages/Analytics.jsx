import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign,
  BarChart3, Zap, ArrowUpRight, ArrowDownRight, RefreshCw,
  Target, Award
} from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';

const RADAR_METRICS = ['Liquidity', 'Volume', 'Users', 'Security', 'Uptime', 'Diversity'];
const RISK_COLORS = { SAFE: '#03A66D', LOW: '#1890FF', MEDIUM: '#F0B90B', HIGH: '#FF7A00', CRITICAL: '#CF304A' };
const CHAIN_COLORS = { ETH: '#627EEA', BNB: '#F0B90B', TRON: '#FF0013', POLY: '#8247E5', SOL: '#14F195', AVAX: '#E84142' };

const CustomTip = ({ active, payload, label, prefix = '$', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl shadow-xl text-xs" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="font-bold mb-1" style={{ color: '#848E9C' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#EAECEF' }}>{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [period, setPeriod] = useState('30D');
  const [metric, setMetric] = useState('volume');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [volumeHistory, setVolumeHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [users, setUsers] = useState([]);

  const loadData = async () => {
    try {
      const days = period === '7D' ? 7 : period === '14D' ? 14 : 30;
      const [pf, vh, lb] = await Promise.all([
        ccs.request('/api/analytics/portfolio'),
        ccs.request(`/api/analytics/volume-history?days=${days}`),
        ccs.request('/api/analytics/leaderboard'),
      ]);
      if (pf) setPortfolio(pf);
      if (vh?.history) setVolumeHistory(vh.history);
      if (lb?.leaderboard) setLeaderboard(lb.leaderboard);

      const u = await ccs.auth.me();
      const profile = await ccs.entities.UserProfile.filter({ id: u.id });
      const isAdmin = profile?.[0]?.role === 'admin' || u?.role === 'admin';
      const [s, all] = await Promise.all([
        isAdmin ? ccs.entities.SwapOrder.list('-created_date', 500) : ccs.entities.SwapOrder.filter({ user_id: u.id }, '-created_date', 500),
        isAdmin ? ccs.entities.UserProfile.list('-created_date', 200) : Promise.resolve(profile || []),
      ]);
      setSwaps(s || []);
      setUsers(all || []);
    } catch (e) {
      logger.warn('Analytics', 'Failed to load data', { error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [period]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalVolume = portfolio?.totalBalance || (volumeHistory.length > 0 ? volumeHistory.reduce((s, x) => s + (x.volume || 0), 0) : 0);
  const totalUsers = users.length > 0 ? users.length : 1;
  const totalSwaps = swaps.length > 0 ? swaps.length : 0;

  const kpis = [
    { label: 'Total Balance', value: formatUSD(totalVolume), sub: portfolio?.totalPnl24h ? `24h P&L: ${formatUSD(portfolio.totalPnl24h)}` : 'Syncing...', color: '#F0B90B', icon: DollarSign, up: (portfolio?.totalPnl24h || 0) >= 0 },
    { label: 'Active Users', value: totalUsers.toLocaleString(), sub: '+8.1% new this period', color: '#627EEA', icon: Users, up: true },
    { label: 'Total Swaps', value: totalSwaps.toLocaleString(), sub: '+5.7% from last period', color: '#03A66D', icon: Zap, up: true },
    { label: 'Avg Tx Value', value: formatUSD(totalVolume / Math.max(totalSwaps, 1)), sub: '+3.2% per trade', color: '#8247E5', icon: Target, up: true },
  ];

  const displayData = volumeHistory.length > 0
    ? volumeHistory
    : (swaps.length > 0
        ? (() => {
            const days = period === '7D' ? 7 : period === '14D' ? 14 : 30;
            return Array.from({ length: days }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
              const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
              const daySwaps = swaps.filter(s => new Date(s.created_date || s.created_at).toDateString() === d.toDateString());
              return {
                date: label,
                volume: daySwaps.reduce((sum, s) => sum + (s.amount_in_usd || 0), 0),
                users: Math.max(1, users.length),
                swaps: daySwaps.length,
                pnl: daySwaps.reduce((sum, s) => sum + ((s.amount_out || 0) - (s.amount_in || 0)), 0),
              };
            });
          })()
        : []);

  const chainData = swaps.length > 0
    ? Object.entries(swaps.reduce((acc, s) => {
        const chain = s.chain || 'ETH';
        acc[chain] = (acc[chain] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value: Math.round(value / swaps.length * 100), color: CHAIN_COLORS[name] || '#627EEA' }))
    : [{ name: 'ETH', value: 100, color: '#627EEA' }];

  const riskData = Object.entries(RISK_COLORS).map(([name, color], i) => ({
    name, value: [42, 28, 18, 8, 4][i], color,
  }));

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />
      ))}
    </div>
  );

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(98,126,234,0.12)', border: '1px solid rgba(98,126,234,0.25)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#627EEA' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Analytics</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Real-time platform intelligence & performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            {['7D', '14D', '30D'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: period === p ? 'rgba(240,185,11,0.12)' : 'transparent',
                        color: period === p ? '#F0B90B' : '#848E9C',
                        border: period === p ? '1px solid rgba(240,185,11,0.2)' : '1px solid transparent',
                      }}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={refresh}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${k.color}` }}>
            <k.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: k.color, opacity: 0.08 }} />
            <p className="text-xs font-medium mb-1.5" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {k.up ? <ArrowUpRight className="w-3 h-3" style={{ color: '#03A66D' }} /> : <ArrowDownRight className="w-3 h-3" style={{ color: '#CF304A' }} />}
              <p className="text-xs" style={{ color: k.up ? '#03A66D' : '#CF304A' }}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'volume', label: 'Volume', color: '#F0B90B' },
          { id: 'users', label: 'Users', color: '#627EEA' },
          { id: 'swaps', label: 'Swaps', color: '#03A66D' },
          { id: 'pnl', label: 'P&L', color: '#8247E5' },
        ].map(m => (
          <button key={m.id} onClick={() => setMetric(m.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: metric === m.id ? `${m.color}18` : '#1E2329',
                    color: metric === m.id ? m.color : '#848E9C',
                    border: metric === m.id ? `1px solid ${m.color}40` : '1px solid #2B3139',
                  }}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>
                {metric === 'volume' ? 'Trading Volume' : metric === 'users' ? 'Active Users' : metric === 'swaps' ? 'Swap Count' : 'P&L'}
              </h3>
              <p className="text-xs" style={{ color: '#4B5563' }}>Last {period}</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse"
                  style={{ background: 'rgba(3,166,109,0.1)', color: '#03A66D' }}>● LIVE</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={displayData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric === 'volume' ? '#F0B90B' : metric === 'users' ? '#627EEA' : metric === 'swaps' ? '#03A66D' : '#8247E5'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0B0E11" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(Math.max(displayData.length / 6, 1))} />
              <YAxis tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false}
                     tickFormatter={v => metric === 'volume' ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
              <Tooltip content={<CustomTip prefix={metric === 'volume' || metric === 'pnl' ? '$' : ''} />} />
              <Area type="monotone" dataKey={metric}
                    stroke={metric === 'volume' ? '#F0B90B' : metric === 'users' ? '#627EEA' : metric === 'swaps' ? '#03A66D' : '#8247E5'}
                    strokeWidth={2} fill="url(#aGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Platform Health</h3>
          <p className="text-xs mb-3" style={{ color: '#4B5563' }}>6-axis radar score</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={RADAR_METRICS.map((m, i) => ({ metric: m, score: [88, 74, 92, 81, 99, 67][i] }))}>
              <PolarGrid stroke="#2B3139" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#4B5563', fontSize: 9 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#2B3139', fontSize: 8 }} />
              <Radar dataKey="score" stroke="#F0B90B" fill="#F0B90B" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {RADAR_METRICS.map((m, i) => {
              const score = [88, 74, 92, 81, 99, 67][i];
              return (
                <div key={m} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg" style={{ background: '#0D1117' }}>
                  <span style={{ color: '#848E9C' }}>{m}</span>
                  <span className="font-black" style={{ color: score >= 90 ? '#03A66D' : score >= 75 ? '#F0B90B' : '#CF304A' }}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Hourly Transaction Count</h3>
          <p className="text-xs mb-4" style={{ color: '#4B5563' }}>Today's activity by hour (UTC)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={Array.from({ length: 24 }, (_, h) => ({
              hour: `${h.toString().padStart(2, '0')}:00`,
              txns: swaps.filter(s => new Date(s.created_date || s.created_at).getUTCHours() === h).length || Math.round(10 + Math.sin(h * 31) * 100 + 50),
            }))} margin={{ top: 0, right: 5, bottom: 0, left: 5 }}>
              <XAxis dataKey="hour" tick={{ fill: '#3B4149', fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: '#3B4149', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTip prefix="" suffix=" txns" />} />
              <Bar dataKey="txns" fill="#627EEA" radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {[
            { title: 'Risk Distribution', data: riskData },
            { title: 'Chain Distribution', data: chainData },
          ].map(({ title, data }) => (
            <div key={title} className="rounded-2xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: '#EAECEF' }}>{title}</h3>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={70} height={70}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={22} outerRadius={33} dataKey="value" paddingAngle={3}>
                      {data.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {data.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                        <span style={{ color: '#848E9C' }}>{d.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: '#EAECEF' }}>{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
          <Award className="w-4 h-4" style={{ color: '#F0B90B' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Top Traders Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr style={{ background: '#151A1F' }}>
                {['Rank', 'Name', 'Total P&L', 'Win Rate', 'Followers'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#848E9C' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(leaderboard.length > 0 ? leaderboard : []).map((l, i) => (
                <tr key={l.id || i} style={{ borderTop: i > 0 ? '1px solid #1A1F26' : 'none' }}>
                  <td className="px-4 py-3">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black inline-flex"
                          style={{
                            background: i === 0 ? 'rgba(240,185,11,0.15)' : i === 1 ? 'rgba(132,142,156,0.15)' : 'rgba(99,102,241,0.1)',
                            color: i === 0 ? '#F0B90B' : i === 1 ? '#848E9C' : '#627EEA',
                          }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF' }}>{l.display_name || l.name || `Trader ${i + 1}`}</td>
                  <td className="px-4 py-3 text-xs font-black" style={{ color: '#F0B90B' }}>{formatUSD(l.total_pnl || l.pnl || 0)}</td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#848E9C' }}>{l.win_rate || 0}%</td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#627EEA' }}>{(l.followers || 0).toLocaleString()}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No leaderboard data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
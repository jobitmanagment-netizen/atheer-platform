import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatUSD } from '@/lib/ai-risk-engine';
import { RISK_COLORS } from '@/lib/ccs-constants';
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle, DollarSign, Zap, Shield } from 'lucide-react';

const TT = { contentStyle: { background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }, cursor: { fill: 'rgba(240,185,11,0.05)' } };
const CHAIN_COLORS = { ETH: '#627EEA', BNB: '#F0B90B', POLY: '#8247E5', TRON: '#FF0013', Unknown: '#848E9C' };

function genDaysMap(days) {
  const map = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[key] = { date: key, swaps: 0, volume: 0, risk_sum: 0, fees: 0 };
  }
  return map;
}

export default function AdminStatsPanel({ swaps, users, auditLogs }) {
  const [period, setPeriod] = useState(7);

  const stats = useMemo(() => {
    const totalVolume    = swaps.reduce((s, x) => s + (x.amount_in_usd || 0), 0);
    const totalFees      = swaps.reduce((s, x) => s + (x.fee_usd || 0), 0);
    const avgRisk        = swaps.length ? swaps.reduce((s, x) => s + (x.risk_score || 0), 0) / swaps.length : 0;
    const completedSwaps = swaps.filter(s => s.status === 'completed').length;
    const successRate    = swaps.length ? ((completedSwaps / swaps.length) * 100).toFixed(1) : 0;
    const highRiskCount  = swaps.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL').length;

    // Risk distribution
    const riskDist = ['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(level => ({
      level, color: RISK_COLORS[level]?.text,
      count: swaps.filter(s => s.risk_level === level).length,
      volume: swaps.filter(s => s.risk_level === level).reduce((a, b) => a + (b.amount_in_usd || 0), 0),
    }));

    // Volume by chain
    const chainMap = {};
    swaps.forEach(s => {
      const c = s.from_chain || 'Unknown';
      if (!chainMap[c]) chainMap[c] = { chain: c, volume: 0, count: 0 };
      chainMap[c].volume += s.amount_in_usd || 0;
      chainMap[c].count  += 1;
    });
    const chainData = Object.values(chainMap).sort((a, b) => b.volume - a.volume);

    // Daily data (7 or 30 days)
    const dayMap = genDaysMap(period === 30 ? 30 : 7);
    swaps.forEach(s => {
      const key = new Date(s.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dayMap[key]) {
        dayMap[key].swaps  += 1;
        dayMap[key].volume += s.amount_in_usd || 0;
        dayMap[key].fees   += s.fee_usd || 0;
        dayMap[key].risk_sum += s.risk_score || 0;
      }
    });
    const dailyData = Object.values(dayMap).map(d => ({
      ...d,
      avg_risk: d.swaps > 0 ? Math.round(d.risk_sum / d.swaps) : 0,
      volume: Math.round(d.volume),
      fees: parseFloat(d.fees.toFixed(2)),
    }));

    // Token pair frequency
    const pairMap = {};
    swaps.forEach(s => {
      const pair = `${s.from_token}→${s.to_token}`;
      pairMap[pair] = (pairMap[pair] || 0) + 1;
    });
    const topPairs = Object.entries(pairMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pair, count]) => ({ pair, count }));

    // KYC breakdown
    const kycDist = [
      { name: 'Verified',  value: users.filter(u => u.kyc_status === 'verified').length,  color: '#03A66D' },
      { name: 'Pending',   value: users.filter(u => u.kyc_status === 'pending').length,   color: '#F0B90B' },
      { name: 'None',      value: users.filter(u => !u.kyc_status || u.kyc_status === 'none').length, color: '#848E9C' },
    ];

    // User activity feed (last 5 unique users with swaps)
    const recentActivity = swaps.slice(0, 8).map(s => ({
      id: s.id, pair: `${s.from_token} → ${s.to_token}`,
      usd: formatUSD(s.amount_in_usd || 0),
      risk: s.risk_level, score: s.risk_score,
      date: new Date(s.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }));

    return { totalVolume, totalFees, avgRisk, successRate, riskDist, chainData, dailyData, kycDist, topPairs, highRiskCount, completedSwaps, recentActivity };
  }, [swaps, users, period]);

  const kpiCards = [
    { label: 'إجمالي حجم التداول', value: formatUSD(stats.totalVolume), icon: DollarSign, color: '#F0B90B',  trend: '+12.4%', up: true  },
    { label: 'إجمالي الرسوم',       value: formatUSD(stats.totalFees),   icon: Zap,        color: '#03A66D',  trend: '+8.2%',  up: true  },
    { label: 'متوسط درجة المخاطر',   value: `${stats.avgRisk.toFixed(1)}/100`, icon: Shield, color: stats.avgRisk >= 60 ? '#CF304A' : '#03A66D', trend: stats.avgRisk >= 60 ? 'مرتفع' : 'طبيعي', up: stats.avgRisk < 60 },
    { label: 'معدل النجاح',          value: `${stats.successRate}%`,       icon: Activity,   color: '#03A66D',  trend: '+2.1%',  up: true  },
    { label: 'إجمالي المستخدمين',    value: users.length,                  icon: Users,      color: '#627EEA',  trend: '+5 هذا الأسبوع', up: true },
    { label: 'صفقات عالية المخاطر',  value: stats.highRiskCount,           icon: AlertTriangle, color: '#CF304A', trend: `${((stats.highRiskCount / Math.max(swaps.length, 1)) * 100).toFixed(1)}%`, up: false },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderLeft: `3px solid ${k.color}` }}>
            <div className="absolute right-2 top-2 opacity-8">
              <k.icon className="w-8 h-8" style={{ color: k.color, opacity: 0.08 }} />
            </div>
            <p className="text-xs mb-1 leading-tight" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black mb-0.5" style={{ color: k.color }}>{k.value}</p>
            <div className="flex items-center gap-1 text-xs">
              {k.up ? <TrendingUp className="w-3 h-3" style={{ color: '#03A66D' }} /> : <TrendingDown className="w-3 h-3" style={{ color: '#CF304A' }} />}
              <span style={{ color: k.up ? '#03A66D' : '#CF304A' }}>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: '#848E9C' }}>الرسوم البيانية</h3>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#151A1F' }}>
          {[7, 30].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
                    className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                    style={{ background: period === p ? '#1E2329' : 'transparent', color: period === p ? '#F0B90B' : '#4B5563', border: period === p ? '1px solid #2B3139' : '1px solid transparent' }}>
              {p === 7 ? '7 أيام' : '30 يوم'}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volume + Swaps Composed Chart */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-4" style={{ color: '#EAECEF' }}>حجم التداول اليومي</h3>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={stats.dailyData}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F0B90B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" />
              <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="vol" orientation="left"  tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="cnt" orientation="right" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v, n) => [n === 'volume' ? `$${v.toLocaleString()}` : v, n === 'volume' ? 'حجم' : 'صفقات']} />
              <Area yAxisId="vol" type="monotone" dataKey="volume" stroke="#F0B90B" strokeWidth={2} fill="url(#volGrad)" />
              <Bar  yAxisId="cnt" dataKey="swaps" fill="#627EEA" opacity={0.6} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Risk score trend */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-4" style={{ color: '#EAECEF' }}>متوسط درجة المخاطر اليومي</h3>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={stats.dailyData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#CF304A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#CF304A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" />
              <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v) => [`${v}/100`, 'متوسط المخاطر']} />
              <Area type="monotone" dataKey="avg_risk" stroke="#CF304A" strokeWidth={2} fill="url(#riskGrad)" dot={{ fill: '#CF304A', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Distribution */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-4" style={{ color: '#EAECEF' }}>توزيع المخاطر</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.riskDist}>
              <XAxis dataKey="level" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v, n) => [v, n === 'count' ? 'عدد' : 'حجم']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.riskDist.map(e => <Cell key={e.level} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume by Chain */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-4" style={{ color: '#EAECEF' }}>الحجم حسب الشبكة</h3>
          {stats.chainData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs" style={{ color: '#4B5563' }}>لا توجد بيانات</div>
          ) : (
            <div className="space-y-3">
              {stats.chainData.slice(0, 5).map(c => {
                const pct = stats.totalVolume > 0 ? (c.volume / stats.totalVolume * 100) : 0;
                const col = CHAIN_COLORS[c.chain] || '#848E9C';
                return (
                  <div key={c.chain}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold" style={{ color: col }}>{c.chain}</span>
                      <span style={{ color: '#848E9C' }}>{formatUSD(c.volume)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KYC Pie */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-3" style={{ color: '#EAECEF' }}>حالة KYC</h3>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={130}>
              <PieChart>
                <Pie data={stats.kycDist} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={4}>
                  {stats.kycDist.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {stats.kycDist.map(k => (
                <div key={k.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: k.color }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{k.name}</p>
                    <p className="text-xs" style={{ color: '#848E9C' }}>{k.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Pairs + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Token Pairs */}
        <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="font-semibold text-xs mb-4" style={{ color: '#EAECEF' }}>أكثر الأزواج تداولاً</h3>
          {stats.topPairs.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: '#4B5563' }}>لا توجد بيانات</div>
          ) : (
            <div className="space-y-3">
              {stats.topPairs.map((p, i) => {
                const maxCount = stats.topPairs[0].count;
                const pct = (p.count / maxCount) * 100;
                const colors = ['#F0B90B', '#627EEA', '#03A66D', '#8247E5', '#FF7A00'];
                return (
                  <div key={p.pair}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded flex items-center justify-center text-xs font-black" style={{ background: `${colors[i]}18`, color: colors[i] }}>{i + 1}</span>
                        <span className="font-bold" style={{ color: '#EAECEF' }}>{p.pair}</span>
                      </div>
                      <span className="font-semibold" style={{ color: colors[i] }}>{p.count} صفقة</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="px-4 py-3 text-xs font-bold flex items-center gap-2" style={{ color: '#EAECEF', borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#03A66D' }} />
            آخر الصفقات المباشرة
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {stats.recentActivity.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: '#4B5563' }}>لا توجد صفقات</div>
            ) : stats.recentActivity.map(a => {
              const riskColors = { SAFE: '#03A66D', LOW: '#03A66D', MEDIUM: '#F0B90B', HIGH: '#FF7A00', CRITICAL: '#CF304A' };
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #1A1F26' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColors[a.risk] || '#848E9C' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{a.pair}</p>
                      <p className="text-xs" style={{ color: '#4B5563' }}>{a.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#EAECEF' }}>{a.usd}</p>
                    <p className="text-xs" style={{ color: riskColors[a.risk] || '#848E9C' }}>{a.risk} ({a.score})</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
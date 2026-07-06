import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';
import { logger } from '@/lib/logger';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PerformanceReport({ onClose, wallets = [], transactions = [] }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    loadReport();
  }, [period, wallets, transactions]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const txs = transactions || [];

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const now = Date.now();
      const periodStart = now - (days * 86400000);

      const periodTxs = (txs || []).filter(t => new Date(t.created_date).getTime() >= periodStart);
      const deposits = periodTxs.filter(t => t.type === 'deposit');
      const withdrawals = periodTxs.filter(t => t.type === 'withdrawal');

      const totalDeposited = deposits.reduce((s, t) => s + (t.amount_usd || 0), 0);
      const totalWithdrawn = withdrawals.reduce((s, t) => s + (t.amount_usd || 0), 0);
      const netFlow = totalDeposited - totalWithdrawn;
      const totalFees = periodTxs.reduce((s, t) => s + (t.fee_usd || 0), 0);

      const completed = periodTxs.filter(t => t.status === 'completed').length;
      const pending = periodTxs.filter(t => ['pending', 'processing'].includes(t.status)).length;
      const successRate = periodTxs.length > 0 ? (completed / periodTxs.length) * 100 : 0;

      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = d.setHours(0, 0, 0, 0);
        const dayEnd = d.setHours(23, 59, 59, 999);
        const dayTxs = periodTxs.filter(t => {
          const tDate = new Date(t.created_date).getTime();
          return tDate >= dayStart && tDate <= dayEnd;
        });
        const dayDeposits = dayTxs.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount_usd || 0), 0);
        const dayWithdrawals = dayTxs.filter(t => t.type === 'withdrawal').reduce((s, t) => s + (t.amount_usd || 0), 0);
        dailyData.push({
          date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          deposits: dayDeposits,
          withdrawals: dayWithdrawals,
          net: dayDeposits - dayWithdrawals,
        });
      }

      const methodBreakdown = {};
      periodTxs.forEach(t => {
        const method = t.method || 'OTHER';
        if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, volume: 0 };
        methodBreakdown[method].count++;
        methodBreakdown[method].volume += (t.amount_usd || 0);
      });

      setReport({
        totalDeposited,
        totalWithdrawn,
        netFlow,
        totalFees,
        completed,
        pending,
        successRate,
        dailyData,
        methodBreakdown,
        walletCount: wallets.length || 0,
      });
    } catch (e) {
      logger.error('PerformanceReport', 'Report load error', { error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csv = [
      ['Date', 'Deposits', 'Withdrawals', 'Net Flow'],
      ...report.dailyData.map(d => [d.date, d.deposits, d.withdrawals, d.net]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atheer-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />)}
    </div>
  );

  const COLORS = ['#03A66D', '#CF304A', '#F0B90B', '#627EEA', '#8247E5'];

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#627EEA' }} />
          <h3 className="text-lg font-black" style={{ color: '#EAECEF' }}>Performance Report</h3>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
          <button onClick={exportReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D', border: '1px solid rgba(3,166,109,0.2)' }}>
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Deposited', value: formatUSD(report.totalDeposited), color: '#03A66D', icon: DollarSign },
          { label: 'Total Withdrawn', value: formatUSD(report.totalWithdrawn), color: '#CF304A', icon: DollarSign },
          { label: 'Net Flow', value: formatUSD(report.netFlow), color: report.netFlow >= 0 ? '#03A66D' : '#CF304A', icon: TrendingUp },
          { label: 'Success Rate', value: `${report.successRate.toFixed(1)}%`, color: '#F0B90B', icon: Percent },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${k.color}` }}>
            <k.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: k.color, opacity: 0.1 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4" style={{ color: '#627EEA' }} />
          <h4 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Daily Flow</h4>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={report.dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#03A66D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#03A66D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="withdrawGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CF304A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#CF304A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(report.dailyData.length / 7)} />
            <YAxis tick={{ fill: '#3B4149', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, color: '#EAECEF', fontSize: 11 }} />
            <Area type="monotone" dataKey="deposits" stroke="#03A66D" strokeWidth={2} fill="url(#depositGrad)" />
            <Area type="monotone" dataKey="withdrawals" stroke="#CF304A" strokeWidth={2} fill="url(#withdrawGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Method Breakdown */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <h4 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Transfer Methods</h4>
          </div>
          <span className="text-xs" style={{ color: '#848E9C' }}>{report.walletCount} wallets</span>
        </div>
        <div className="space-y-2">
          {Object.entries(report.methodBreakdown).map(([method, data], i) => (
            <div key={method} className="flex items-center justify-between p-3 rounded-xl"
                 style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COLORS[i % COLORS.length]}18`, color: COLORS[i % COLORS.length] }}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#EAECEF' }}>{method}</p>
                  <p className="text-xs" style={{ color: '#848E9C' }}>{data.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: '#EAECEF' }}>{formatUSD(data.volume)}</p>
                <p className="text-xs" style={{ color: '#848E9C' }}>{((data.volume / report.totalDeposited) * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completed', value: report.completed, color: '#03A66D' },
          { label: 'Pending', value: report.pending, color: '#F0B90B' },
          { label: 'Total Fees', value: formatUSD(report.totalFees), color: '#627EEA' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#848E9C' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
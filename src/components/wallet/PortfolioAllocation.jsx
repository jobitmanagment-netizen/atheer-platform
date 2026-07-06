import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#F0B90B', '#627EEA', '#FF0013', '#8247E5', '#14F195', '#03A66D', '#CF304A', '#00B7C3'];

export default function PortfolioAllocation({ wallets }) {
  const data = wallets
    .filter(w => (w.balance_usd || 0) > 0)
    .map(w => ({ name: w.chain, value: w.balance_usd || 0, token: w.token_symbol }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Portfolio Allocation</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs" style={{ color: '#848E9C' }}>Total</span>
            <span className="text-sm font-black" style={{ color: '#F0B90B' }}>${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="font-semibold" style={{ color: '#EAECEF' }}>{d.token} · {d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold" style={{ color: '#EAECEF' }}>${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="font-mono" style={{ color: '#848E9C', minWidth: 40, textAlign: 'right' }}>{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
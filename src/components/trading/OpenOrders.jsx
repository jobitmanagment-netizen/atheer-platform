import { Loader2, Inbox } from 'lucide-react';

export default function OpenOrders({ orders, onCancel, loading, okxConfigured, cancellingId }) {
  const fmtType = (o) => {
    if (o.ord_type === 'oco') return 'OCO';
    if (o.ord_type === 'conditional') return 'Stop';
    if (o.ord_type === 'limit') return 'Limit';
    if (o.ord_type === 'market') return 'Market';
    return o.ord_type || 'Order';
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
        <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Open Orders</h3>
        <span className="text-xs flex items-center gap-1.5" style={{ color: '#848E9C' }}>
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {orders.length} open
        </span>
      </div>

      {!okxConfigured ? (
        <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <Inbox className="w-7 h-7" style={{ color: '#2B3139' }} />
          <p className="text-xs font-medium" style={{ color: '#848E9C' }}>Connect your OKX API keys in Settings</p>
          <p className="text-xs" style={{ color: '#4B5563' }}>to view and manage your live open orders</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No open orders on OKX</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px]">
            <thead><tr style={{ background: '#151A1F' }}>
              {['Pair', 'Type', 'Side', 'Price', 'Amount', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: '#848E9C' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.order_id} style={{ borderTop: '1px solid #1E2329' }}>
                  <td className="px-3 py-2.5 text-xs font-bold" style={{ color: '#EAECEF' }}>{o.inst_id}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: '#F0B90B' }}>{fmtType(o)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold" style={{ color: o.side === 'buy' ? '#03A66D' : '#CF304A' }}>
                    {o.side?.toUpperCase()}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: '#EAECEF' }}>
                    {o.ord_type === 'oco'
                      ? `TP ${o.tp_trigger || '—'} / SL ${o.sl_trigger || '—'}`
                      : (o.price && o.price !== '-1' ? o.price : 'Market')}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: '#EAECEF' }}>{o.size}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onCancel(o)} disabled={cancellingId === o.order_id}
                            className="text-xs font-bold px-2 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
                      {cancellingId === o.order_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
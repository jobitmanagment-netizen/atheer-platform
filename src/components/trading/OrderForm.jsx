import { Loader2 } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';

const ORDER_TYPES = [
  { id: 'market', label: 'Market' },
  { id: 'limit', label: 'Limit' },
  { id: 'conditional', label: 'Stop-Limit' },
  { id: 'oco', label: 'OCO' },
];

export default function OrderForm({
  symbol, side, setSide, orderType, setOrderType,
  amount, setAmount, priceInput, setPriceInput,
  stopPrice, setStopPrice, takeProfit, setTakeProfit,
  livePrice, handleSubmit, submitting, balance, okxConfigured,
}) {
  const inputStyle = { background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' };
  const cost = amount ? parseFloat(amount) * (livePrice || 1) : 0;
  const maxAmount = (balance || 1000) / (livePrice || 1);

  const canSubmit = amount && !submitting &&
    (orderType === 'market' ||
     (orderType === 'limit' && priceInput) ||
     (orderType === 'conditional' && stopPrice) ||
     (orderType === 'oco' && takeProfit && stopPrice));

  return (
    <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: '#0B0E11' }}>
        {ORDER_TYPES.map(t => (
          <button key={t.id} onClick={() => setOrderType(t.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: orderType === t.id ? '#1E2329' : 'transparent', color: orderType === t.id ? '#F0B90B' : '#848E9C' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setSide('buy')} className="py-2.5 rounded-xl text-sm font-black transition-all"
                style={{ background: side === 'buy' ? 'rgba(3,166,109,0.15)' : '#0B0E11', color: side === 'buy' ? '#03A66D' : '#848E9C', border: `1px solid ${side === 'buy' ? 'rgba(3,166,109,0.3)' : '#2B3139'}` }}>
          Buy {symbol}
        </button>
        <button onClick={() => setSide('sell')} className="py-2.5 rounded-xl text-sm font-black transition-all"
                style={{ background: side === 'sell' ? 'rgba(207,48,74,0.15)' : '#0B0E11', color: side === 'sell' ? '#CF304A' : '#848E9C', border: `1px solid ${side === 'sell' ? 'rgba(207,48,74,0.3)' : '#2B3139'}` }}>
          Sell {symbol}
        </button>
      </div>

      {/* Limit price */}
      {orderType === 'limit' && (
        <div className="mb-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#848E9C' }}>Limit Price (USDT)</label>
          <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                 placeholder={livePrice ? livePrice.toString() : '0.00'} className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
        </div>
      )}

      {/* Stop-Limit: stop trigger + optional limit price */}
      {orderType === 'conditional' && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#F0B90B' }}>Stop Trigger</label>
            <input type="number" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="0.00"
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#848E9C' }}>Limit Price</label>
            <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="Market"
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
          </div>
        </div>
      )}

      {/* OCO: take profit + stop loss */}
      {orderType === 'oco' && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#03A66D' }}>Take Profit</label>
            <input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="0.00"
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#CF304A' }}>Stop Loss</label>
            <input type="number" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="0.00"
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className="text-xs font-semibold mb-1 block" style={{ color: '#848E9C' }}>Amount ({symbol})</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
               className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
      </div>

      <div className="flex gap-1 mb-3">
        {[25, 50, 75, 100].map(p => (
          <button key={p} onClick={() => setAmount((maxAmount * p / 100).toFixed(6))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: '#0B0E11', color: '#848E9C', border: '1px solid #2B3139' }}>{p}%</button>
        ))}
      </div>

      <div className="space-y-1.5 mb-3 p-3 rounded-xl text-xs" style={{ background: '#0B0E11' }}>
        <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Available</span><span className="font-mono font-bold" style={{ color: '#EAECEF' }}>{balance.toLocaleString()} USDT</span></div>
        <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Est. Cost</span><span className="font-mono font-bold" style={{ color: '#EAECEF' }}>{formatUSD(cost)}</span></div>
        <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Fee (0.1%)</span><span className="font-mono font-bold" style={{ color: '#848E9C' }}>{formatUSD(cost * 0.001)}</span></div>
      </div>

      {!okxConfigured && (
        <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}>
          Connect OKX API keys in Settings to place live orders.
        </div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ background: side === 'buy' ? 'linear-gradient(135deg, #03A66D, #04D484)' : 'linear-gradient(135deg, #CF304A, #FF4444)' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
      </button>
    </div>
  );
}
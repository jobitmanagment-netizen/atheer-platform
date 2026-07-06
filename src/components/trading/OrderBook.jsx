import { BookOpen } from 'lucide-react';

export default function OrderBook({ orderBook, livePrice, spread }) {
  const fmt = (v) => v < 1 ? v.toFixed(4) : v.toFixed(2);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #2B3139' }}>
        <BookOpen className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
        <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Order Book</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-xs font-semibold" style={{ color: '#4B5563', borderBottom: '1px solid #1E2329' }}>
        <span>Price</span><span className="text-right">Amount</span><span className="text-right">Total</span>
      </div>
      <div className="max-h-[160px] overflow-y-auto">
        {[...orderBook.asks].reverse().slice(0, 8).map((ask, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-1 text-xs relative hover:bg-white/5" style={{ color: '#CF304A' }}>
            <div className="absolute right-0 top-0 bottom-0" style={{ width: `${(ask.total / orderBook.maxTotal) * 100}%`, background: 'rgba(207,48,74,0.06)' }} />
            <span className="relative font-mono">{fmt(ask.price)}</span>
            <span className="relative text-right font-mono" style={{ color: '#848E9C' }}>{ask.amount.toFixed(3)}</span>
            <span className="relative text-right font-mono" style={{ color: '#4B5563' }}>{ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-center" style={{ background: '#151A1F', borderTop: '1px solid #2B3139', borderBottom: '1px solid #2B3139' }}>
        <span className="text-sm font-black font-mono" style={{ color: '#F0B90B' }}>
          ${livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="text-xs ml-2" style={{ color: '#4B5563' }}>Spread: ${spread.toFixed(2)}</span>
      </div>
      <div className="max-h-[160px] overflow-y-auto">
        {orderBook.bids.slice(0, 8).map((bid, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-1 text-xs relative hover:bg-white/5" style={{ color: '#03A66D' }}>
            <div className="absolute right-0 top-0 bottom-0" style={{ width: `${(bid.total / orderBook.maxTotal) * 100}%`, background: 'rgba(3,166,109,0.06)' }} />
            <span className="relative font-mono">{fmt(bid.price)}</span>
            <span className="relative text-right font-mono" style={{ color: '#848E9C' }}>{bid.amount.toFixed(3)}</span>
            <span className="relative text-right font-mono" style={{ color: '#4B5563' }}>{bid.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {/* Buy/Sell pressure bar */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between text-xs font-bold mb-1">
          <span style={{ color: '#03A66D' }}>B {(orderBook.buyRatio ?? 50).toFixed(0)}%</span>
          <span style={{ color: '#CF304A' }}>{(100 - (orderBook.buyRatio ?? 50)).toFixed(0)}% S</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#0B0E11' }}>
          <div style={{ width: `${orderBook.buyRatio ?? 50}%`, background: '#03A66D', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${100 - (orderBook.buyRatio ?? 50)}%`, background: '#CF304A', transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  );
}
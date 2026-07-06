const PAIRS = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'BNB', name: 'BNB', color: '#F0B90B' },
  { symbol: 'SOL', name: 'Solana', color: '#14F195' },
  { symbol: 'XRP', name: 'Ripple', color: '#23292F' },
];

export default function PairSelector({ symbol, setSymbol, priceData }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {PAIRS.map(p => {
        const data = priceData[p.symbol];
        const isActive = symbol === p.symbol;
        const change = data?.change_percent || 0;
        const price = data?.price || 0;
        return (
          <button key={p.symbol} onClick={() => setSymbol(p.symbol)}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl transition-all"
                  style={{
                    background: isActive ? 'rgba(240,185,11,0.06)' : '#1E2329',
                    border: `1px solid ${isActive ? 'rgba(240,185,11,0.2)' : '#2B3139'}`,
                  }}>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                   style={{ background: `${p.color}22`, color: p.color }}>{p.symbol[0]}</div>
              <div className="text-left">
                <div className="text-xs font-bold" style={{ color: isActive ? '#F0B90B' : '#EAECEF' }}>{p.symbol}/USDT</div>
                {price > 0 && (
                  <div className="text-xs font-mono" style={{ color: change >= 0 ? '#03A66D' : '#CF304A' }}>
                    ${price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
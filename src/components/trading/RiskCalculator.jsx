import { useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, X } from 'lucide-react';

export default function RiskCalculator({ onClose }) {
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [direction, setDirection] = useState('long');

  const calculatePnL = () => {
    if (!entryPrice || !exitPrice || !positionSize) return null;

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const size = parseFloat(positionSize);
    const lev = parseFloat(leverage) || 1;

    const priceChange = direction === 'long' ? (exit - entry) / entry : (entry - exit) / entry;
    const pnl = size * priceChange * lev;
    const pnlPercent = priceChange * lev * 100;

    return { pnl, pnlPercent };
  };

  const result = calculatePnL();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5" style={{ color: '#F0B90B' }} />
            <h3 className="text-base font-bold" style={{ color: '#EAECEF' }}>Risk Calculator</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-opacity-80" style={{ background: 'rgba(132,142,156,0.1)' }}>
            <X className="w-4 h-4" style={{ color: '#848E9C' }} />
          </button>
        </div>

        {/* Direction */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setDirection('long')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
              style={{
                background: direction === 'long' ? 'rgba(3,166,109,0.12)' : '#0B0E11',
                color: direction === 'long' ? '#03A66D' : '#848E9C',
                border: direction === 'long' ? '1px solid #03A66D' : '1px solid #2B3139',
              }}
            >
              <TrendingUp className="w-4 h-4" /> Long
            </button>
            <button
              onClick={() => setDirection('short')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
              style={{
                background: direction === 'short' ? 'rgba(207,48,74,0.12)' : '#0B0E11',
                color: direction === 'short' ? '#CF304A' : '#848E9C',
                border: direction === 'short' ? '1px solid #CF304A' : '1px solid #2B3139',
              }}
            >
              <TrendingDown className="w-4 h-4" /> Short
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Entry Price (USDT)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Exit Price (USDT)</label>
              <input
                type="number"
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Position Size (USDT)</label>
              <input
                type="number"
                value={positionSize}
                onChange={e => setPositionSize(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Leverage</label>
              <select
                value={leverage}
                onChange={e => setLeverage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              >
                {[1, 2, 3, 5, 10, 20, 50, 100, 125].map(l => (
                  <option key={l} value={l}>{l}x</option>
                ))}
              </select>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-5 rounded-xl p-4 text-center" style={{
              background: result.pnl >= 0 ? 'rgba(3,166,109,0.08)' : 'rgba(207,48,74,0.08)',
              border: `1px solid ${result.pnl >= 0 ? '#03A66D' : '#CF304A'}`,
            }}>
              <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>
                {result.pnl >= 0 ? 'Profit' : 'Loss'}
              </p>
              <p className="text-2xl font-black" style={{ color: result.pnl >= 0 ? '#03A66D' : '#CF304A' }}>
                {result.pnl >= 0 ? '+' : ''}{result.pnl.toFixed(2)} USDT
              </p>
              <p className="text-sm font-bold mt-1" style={{ color: result.pnl >= 0 ? '#03A66D' : '#CF304A' }}>
                {result.pnlPercent >= 0 ? '+' : ''}{result.pnlPercent.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
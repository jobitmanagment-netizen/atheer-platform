import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Zap, TrendingUp, TrendingDown, Loader2, AlertTriangle } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';
import CandlestickChart from '@/components/ccs/CandlestickChart';
import { TOKEN_PRICES } from '@/lib/ccs-constants';

const PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
const LEVERAGE_OPTIONS = [5, 10, 20, 50, 75, 100, 125];

export default function Futures() {
  const [symbol, setSymbol] = useState('BTC');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(20);
  const [margin, setMargin] = useState('');
  const [livePrice, setLivePrice] = useState(TOKEN_PRICES.BTC || 67500);
  const [positions, setPositions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await ccs.functions.invoke('getLiveMarketData', { type: 'price', token: symbol });
        if (res?.data?.price && res.data.price > 0) {
          setLivePrice(res.data.price);
          return;
        }
      } catch (e) {
        logger.warn('Futures', 'Market data API failed; using fallback price', { symbol });
      }
      setLivePrice(TOKEN_PRICES[symbol] || livePrice || 100);
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 8000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => { loadPositions(); }, []);

  const loadPositions = async () => {
    try {
      logger.debug('Futures', 'Loading futures positions');
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) {
        logger.debug('Futures', 'User not authenticated while loading positions');
        setPositions([]);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('Futures', 'Loading positions for user', { userId: user?.id });
      
      const pos = await ccs.entities.FuturesPosition.filter({ user_id: user.id, status: 'open' }, '-created_date');
      logger.debug('Futures', 'Positions loaded', { count: pos?.length || 0 });
      setPositions(pos || []);
    } catch (e) {
      logger.error('Futures', 'Failed to load positions', { error: e?.message || String(e) });
      setPositions([]);
    }
  };

  const handleSubmit = async () => {
    logger.debug('Futures', 'handleSubmit called', { symbol, direction, leverage, margin, livePrice });
    if (!margin || margin.trim() === '' || parseFloat(margin) <= 0) {
      alert('Please enter a valid margin amount');
      return;
    }
    const marginValue = parseFloat(margin);
    if (marginValue < 10) {
      alert('Minimum margin is 10 USDT');
      return;
    }
    if (!livePrice || livePrice <= 0) {
      alert('Market data unavailable. Please try again.');
      return;
    }
    logger.debug('Futures', 'Validation passed, creating position');
    setSubmitting(true);
    try {
      const isAuthed = await ccs.auth.isAuthenticated();
      logger.debug('Futures', 'Authentication check completed', { isAuthed });
      if (!isAuthed) {
        alert('Please log in to open a position');
        setSubmitting(false);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('Futures', 'Resolved current user', { userId: user?.id });
      if (!user || !user.id) {
        alert('Authentication failed. Please log in again.');
        setSubmitting(false);
        return;
      }
      
      const entryPrice = livePrice;
      const size = (marginValue * leverage) / entryPrice;
      const liqPrice = direction === 'long'
        ? entryPrice * (1 - 1 / leverage)
        : entryPrice * (1 + 1 / leverage);
      const positionData = {
        user_id: user.id,
        symbol: `${symbol}-USDT`,
        direction,
        leverage,
        margin: marginValue,
        entry_price: entryPrice,
        liquidation_price: liqPrice,
        size,
        margin_mode: 'isolated',
        status: 'open',
        pnl: 0,
        pnl_percent: 0,
      };
      logger.debug('Futures', 'Creating position', { symbol: positionData.symbol, direction: positionData.direction, leverage: positionData.leverage });
      
      const newPosition = await ccs.entities.FuturesPosition.create(positionData);
      logger.info('Futures', 'Position created', { positionId: newPosition?.id });
      
      if (!newPosition || !newPosition.id) {
        throw new Error('Position creation returned invalid response');
      }
      
      try {
        await ccs.entities.AuditLog.create({
          user_id: user.id,
          action: 'FUTURES_OPEN',
          entity_type: 'FuturesPosition',
          details: `Opened ${direction} ${symbol}-USDT ${leverage}x with ${marginValue} USDT margin`,
          risk_level: 'HIGH',
        });
      } catch (auditErr) {
        logger.warn('Futures', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      
      alert(`✅ Position opened successfully!\n${direction.toUpperCase()} ${symbol}-USDT ${leverage}x\nMargin: ${marginValue} USDT\nEntry: $${entryPrice.toLocaleString()}`);
      setMargin('');
      await loadPositions();
    } catch (e) {
      logger.error('Futures', 'Failed to open position', { error: e?.message || String(e) });
      alert('Failed to open position: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (pos) => {
    if (!confirm(`Close ${pos.symbol} ${pos.direction.toUpperCase()} position?`)) return;
    try {
      const currentPrice = livePrice;
      const pnl = pos.direction === 'long'
        ? (currentPrice - pos.entry_price) * pos.size
        : (pos.entry_price - currentPrice) * pos.size;
      const pnlPercent = (pnl / pos.margin) * 100;
      await ccs.entities.FuturesPosition.update(pos.id, {
        status: 'closed',
        close_price: currentPrice,
        pnl,
        pnl_percent: pnlPercent,
      });
      try {
        await ccs.entities.AuditLog.create({
          user_id: pos.user_id,
          action: 'FUTURES_CLOSE',
          entity_type: 'FuturesPosition',
          details: `Closed ${pos.symbol} ${pos.direction.toUpperCase()} with ${formatUSD(pnl)} PnL`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('Futures', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      await loadPositions();
    } catch (e) {
      logger.error('Futures', 'Failed to close position', { error: e?.message || String(e) });
      alert('Failed to close position.');
    }
  };

  const totalMargin = positions.reduce((s, p) => s + (p.margin || 0), 0);
  const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);

  return (
    <div className="p-4 space-y-4" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(207,48,74,0.12)', border: '1px solid rgba(207,48,74,0.25)' }}>
          <Zap className="w-5 h-5" style={{ color: '#CF304A' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Futures Trading</h1>
          <p className="text-xs" style={{ color: '#4B5563' }}>Up to 125x leverage · Long & Short positions</p>
        </div>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(207,48,74,0.12)', color: '#CF304A' }}>⚡ High Risk</span>
      </div>

      {/* Symbol & Price */}
      <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl" style={{ background: '#151A1F' }}>
        {PAIRS.map(s => (
          <button key={s} onClick={() => setSymbol(s)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: symbol === s ? '#1E2329' : 'transparent', color: symbol === s ? '#F0B90B' : '#848E9C', border: symbol === s ? '1px solid rgba(240,185,11,0.2)' : '1px solid transparent' }}>
            {s}/USDT
          </button>
        ))}
        <div className="ml-auto text-right">
          <div className="text-lg font-black font-mono" style={{ color: '#EAECEF' }}>${livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <CandlestickChart defaultToken={symbol} compact />

        {/* Order Form */}
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setDirection('long')}
                      className="py-2.5 rounded-xl text-sm font-black transition-all"
                      style={{ background: direction === 'long' ? 'rgba(3,166,109,0.15)' : '#0B0E11', color: direction === 'long' ? '#03A66D' : '#848E9C', border: `1px solid ${direction === 'long' ? 'rgba(3,166,109,0.3)' : '#2B3139'}` }}>
                <TrendingUp className="w-4 h-4 inline mr-1" /> Long
              </button>
              <button onClick={() => setDirection('short')}
                      className="py-2.5 rounded-xl text-sm font-black transition-all"
                      style={{ background: direction === 'short' ? 'rgba(207,48,74,0.15)' : '#0B0E11', color: direction === 'short' ? '#CF304A' : '#848E9C', border: `1px solid ${direction === 'short' ? 'rgba(207,48,74,0.3)' : '#2B3139'}` }}>
                <TrendingDown className="w-4 h-4 inline mr-1" /> Short
              </button>
            </div>

            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Leverage: <span className="font-bold" style={{ color: '#F0B90B' }}>{leverage}x</span></label>
            <input type="range" min="1" max="125" value={leverage} onChange={e => setLeverage(parseInt(e.target.value))}
                   className="w-full mb-4" />
            <div className="flex gap-1 mb-4">
              {LEVERAGE_OPTIONS.map(l => (
                <button key={l} onClick={() => setLeverage(l)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: leverage === l ? 'rgba(240,185,11,0.12)' : '#0B0E11', color: leverage === l ? '#F0B90B' : '#848E9C', border: `1px solid ${leverage === l ? 'rgba(240,185,11,0.25)' : '#2B3139'}` }}>
                  {l}x
                </button>
              ))}
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Margin (USDT)</label>
              <input type="number" value={margin} onChange={e => setMargin(e.target.value)} placeholder="0.00"
                     className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>

            <div className="space-y-1.5 mb-4 p-3 rounded-xl text-xs" style={{ background: '#0B0E11' }}>
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Position Size</span><span className="font-mono font-bold" style={{ color: '#EAECEF' }}>{formatUSD(margin ? parseFloat(margin) * leverage : 0)}</span></div>
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Entry Price</span><span className="font-mono font-bold" style={{ color: '#EAECEF' }}>${livePrice ? livePrice.toLocaleString() : '0'}</span></div>
              <div className="flex justify-between"><span style={{ color: '#848E9C' }}>Liquidation Price</span><span className="font-mono font-bold" style={{ color: '#CF304A' }}>${livePrice && margin ? (direction === 'long' ? (livePrice * (1 - 1/leverage)).toFixed(2) : (livePrice * (1 + 1/leverage)).toFixed(2)) : '0'}</span></div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.2)' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#CF304A' }} />
              <p className="text-xs" style={{ color: '#CF304A' }}>Futures trading involves high risk. You can lose your entire margin. Only trade with funds you can afford to lose.</p>
            </div>

            <button onClick={handleSubmit} disabled={!margin || submitting}
                    className="w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: direction === 'long' ? 'linear-gradient(135deg, #03A66D, #04D484)' : 'linear-gradient(135deg, #CF304A, #FF4444)' }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${direction === 'long' ? 'Open Long' : 'Open Short'} ${leverage}x`}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Total Margin</div>
              <div className="text-lg font-black" style={{ color: '#EAECEF' }}>{formatUSD(totalMargin)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Open Positions</div>
              <div className="text-lg font-black" style={{ color: '#EAECEF' }}>{positions.length}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Total PnL</div>
              <div className="text-lg font-black" style={{ color: totalPnl >= 0 ? '#03A66D' : '#CF304A' }}>{formatUSD(totalPnl)}</div>
            </div>
          </div>

          {/* Positions */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Open Positions</h3>
              <span className="text-xs" style={{ color: '#848E9C' }}>{positions.length} active</span>
            </div>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: '#4B5563' }}>No open positions</div>
            ) : (
              <div className="space-y-2 p-3">
                {positions.map(p => {
                  const currentPnl = p.direction === 'long'
                    ? (livePrice - p.entry_price) * p.size
                    : (p.entry_price - livePrice) * p.size;
                  const pnlPercent = (currentPnl / p.margin) * 100;
                  return (
                    <div key={p.id} className="rounded-lg p-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{p.symbol}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.direction === 'long' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{p.direction.toUpperCase()}</span>
                          <span className="text-xs font-bold" style={{ color: '#F0B90B' }}>{p.leverage}x</span>
                        </div>
                        <button onClick={() => handleClose(p)} className="text-xs font-bold px-2 py-1 rounded"
                                style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>Close</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span style={{ color: '#848E9C' }}>Entry: </span><span className="font-mono" style={{ color: '#EAECEF' }}>${p.entry_price.toLocaleString()}</span></div>
                        <div><span style={{ color: '#848E9C' }}>Liq: </span><span className="font-mono" style={{ color: '#CF304A' }}>${p.liquidation_price?.toLocaleString()}</span></div>
                        <div><span style={{ color: '#848E9C' }}>PnL: </span><span className={`font-mono font-bold ${currentPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentPnl >= 0 ? '+' : ''}{formatUSD(currentPnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { ArrowUpDown, Info, Shield, CheckCircle, X, Loader2, TrendingUp, TrendingDown, Zap, Settings, AlertTriangle } from 'lucide-react';
import RiskBadge from '@/components/ccs/RiskBadge';
import ChainBadge from '@/components/ccs/ChainBadge';
import SelectSheet from '@/components/ccs/SelectSheet';
import { calculateRisk, formatUSD } from '@/lib/ai-risk-engine';
import { TOKEN_PRICES, TOKEN_CHAINS, TOKENS, TOKEN_CHANGE_24H } from '@/lib/ccs-constants';

const TOKEN_COLORS = {
  ETH: '#627EEA', BNB: '#F0B90B', MATIC: '#8247E5',
  USDT: '#26A17B', TRX: '#FF0013', 'USDT-TRC20': '#FF0013',
};

function getOrderPrice(order, fallbackPrice) {
  const amountOut = Number(order.amount_out || 0);
  const amountInUsd = Number(order.amount_in_usd || 0);
  if (amountOut > 0 && amountInUsd > 0) {
    return amountInUsd / amountOut;
  }
  return Number(order.price || fallbackPrice || 0);
}

function getOrderQty(order, side) {
  if (side === 'ask') return Number(order.amount_out || order.amount_in || 0);
  return Number(order.amount_in || order.amount_out || 0);
}

function buildOrderBookRows(history, fromToken, toToken, basePrice, side) {
  const exact = history.filter((order) =>
    side === 'ask'
      ? order.from_token === fromToken && order.to_token === toToken
      : order.from_token === toToken && order.to_token === fromToken,
  );
  const fallback = history.filter((order) => order.from_token === fromToken || order.to_token === fromToken || order.from_token === toToken || order.to_token === toToken);
  const source = exact.length > 0 ? exact : fallback;

  return source
    .slice(0, 8)
    .map((order, index) => {
      const price = getOrderPrice(order, basePrice);
      const qty = getOrderQty(order, side) || (index + 1) * 0.1;
      const total = price * qty;
      return {
        price: price.toFixed(basePrice > 100 ? 2 : 5),
        qty: qty.toFixed(4),
        total: total.toFixed(2),
        created_date: order.created_date,
      };
    });
}

function buildRecentTrades(history, fromToken, toToken, basePrice) {
  const source = history
    .filter((order) => order.from_token === fromToken || order.to_token === fromToken || order.from_token === toToken || order.to_token === toToken)
    .slice()
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

  return source.slice(0, 7).map((order, index) => {
    const price = getOrderPrice(order, basePrice);
    const qty = getOrderQty(order, 'ask') || (index + 1) * 0.1;
    return {
      price: price.toFixed(basePrice > 100 ? 2 : 5),
      qty: qty.toFixed(4),
      time: new Date(order.created_date || Date.now()),
      side: order.from_token === fromToken ? 'sell' : 'buy',
    };
  });
}

export default function Swap() {
  const { userProfile } = useOutletContext() || {};
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken,   setToToken]   = useState('USDT');
  const [amountIn,  setAmountIn]  = useState('');
  const [slippage,  setSlippage]  = useState(0.5);
  const [riskResult,   setRiskResult]   = useState(null);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [error,    setError]    = useState(null);
  const [wallets,   setWallets]   = useState([]);
  const [swapHistory, setSwapHistory] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) return;
      const user = await ccs.auth.me();
      if (!user) return;
      const w = await ccs.entities.Wallet.filter({ user_id: user.id });
      setWallets(w || []);
      const swaps = await ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 100);
      setSwapHistory(swaps || []);
    };
    loadData();
  }, []);

  const fromPrice    = TOKEN_PRICES[fromToken] || 1;
  const toPrice      = TOKEN_PRICES[toToken]   || 1;
  const amountInNum  = parseFloat(amountIn) || 0;
  const amountInUSD  = amountInNum * fromPrice;
  const feeUSD       = amountInUSD * 0.001;  // 0.1% Binance-style
  const amountOut    = amountInNum > 0 ? ((amountInUSD - feeUSD) / toPrice) : 0;
  const priceImpact  = amountInUSD > 10000 ? 0.35 : amountInUSD > 1000 ? 0.12 : 0.04;
  const minReceived  = amountOut * (1 - slippage / 100);
  const exchangeRate = fromPrice / toPrice;
  const change24h    = TOKEN_CHANGE_24H[fromToken] || 0;

  const asks = buildOrderBookRows(swapHistory, fromToken, toToken, fromPrice, 'ask');
  const bids = buildOrderBookRows(swapHistory, fromToken, toToken, fromPrice, 'bid');
  const recentTrades = buildRecentTrades(swapHistory, fromToken, toToken, fromPrice);

  useEffect(() => {
    if (amountInNum <= 0) { setRiskResult(null); return; }
    const fromChain    = TOKEN_CHAINS[fromToken] || 'ETH';
    const walletAge    = wallets.length > 0 ? 30 : 0;
    const accountAge   = userProfile ? Math.floor((Date.now() - new Date(userProfile.joined_at || Date.now()).getTime()) / 86400000) : 365;
    const recentSwapsCount = Math.min(12, Math.max(0, Math.floor(amountInUSD / 2500) + (wallets.length > 0 ? 1 : 0)));
    const result = calculateRisk({ amountUSD: amountInUSD, recentSwapsCount, walletAgeDays: walletAge, chain: fromChain, accountAgeDays: accountAge });
    setRiskResult(result);
  }, [amountIn, fromToken, wallets, userProfile, amountInUSD]);

  const handleFlip = () => { setFromToken(toToken); setToToken(fromToken); setAmountIn(''); };

  const handleExecute = async () => {
    logger.debug('Swap', 'handleExecute called', { fromToken, toToken, amountInNum, slippage });
    if (amountInNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      const isAuthed = await ccs.auth.isAuthenticated();
      logger.debug('Swap', 'Authentication check completed', { isAuthed });
      if (!isAuthed) {
        alert('Please log in to execute a swap');
        setExecuting(false);
        return;
      }
      
      const res = await ccs.functions.invoke('executeTrade', {
        from_token: fromToken, to_token: toToken,
        amount_in: amountInNum, slippage,
      });
      const d = res.data || res;
      if (d.error) {
        logger.error('Swap', 'Trade error', { error: d.error });
        throw new Error(d.error);
      }
      logger.info('Swap', 'Trade successful', { tradeId: d.swap?.trade_id, swapId: d.swap?.id });
      setSuccess({ swap: d.swap, txHash: d.swap.tx_hash });
      setShowConfirm(false);
      setAmountIn('');
      setRiskResult(null);
      // Reload wallets to update balances
      const user = await ccs.auth.me();
      const w = await ccs.entities.Wallet.filter({ user_id: user.id });
      setWallets(w || []);
    } catch (e) {
      logger.error('Swap', 'handleExecute error', { error: e?.message || String(e) });
      setError(e.message || 'Trade execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* ── Page Title ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.25)' }}>
            <ArrowUpDown className="w-5 h-5" style={{ color: '#F0B90B' }} />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: '#EAECEF' }}>Convert / Swap</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Instant multi-chain token exchange · CCS Technology</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
               style={{ background: change24h >= 0 ? 'rgba(3,166,109,0.1)' : 'rgba(207,48,74,0.1)', color: change24h >= 0 ? '#03A66D' : '#CF304A', border: `1px solid ${change24h >= 0 ? 'rgba(3,166,109,0.2)' : 'rgba(207,48,74,0.2)'}` }}>
            {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {fromToken} {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      {/* ── Main Layout: Order Book + Swap Form ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Order Book ───────────── */}
        <div className="hidden lg:block rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139' }}>
            <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Order Book</span>
            <span className="text-xs font-black" style={{ color: '#F0B90B' }}>{fromToken}/{toToken}</span>
          </div>
          {/* Ask header */}
          <div className="grid grid-cols-3 px-4 py-2 text-xs font-semibold" style={{ color: '#3B4149', borderBottom: '1px solid #1A1F26' }}>
            <span>Price</span><span className="text-right">Qty</span><span className="text-right">Total</span>
          </div>
          {/* Asks (sells — red) */}
          {asks.slice().reverse().map((r, i) => (
            <div key={`a${i}`} className="relative grid grid-cols-3 px-4 py-1 text-xs hover:opacity-80 cursor-pointer">
              <div className="absolute right-0 top-0 h-full rounded-l-sm" style={{ width: `${20 + i * 8}%`, background: 'rgba(207,48,74,0.06)' }} />
              <span className="font-semibold z-10" style={{ color: '#CF304A' }}>{r.price}</span>
              <span className="text-right z-10" style={{ color: '#848E9C' }}>{r.qty}</span>
              <span className="text-right z-10" style={{ color: '#4B5563' }}>{r.total}</span>
            </div>
          ))}
          {/* Spread */}
          <div className="flex items-center justify-center py-2 gap-2" style={{ borderTop: '1px solid #1A1F26', borderBottom: '1px solid #1A1F26' }}>
            <span className="text-sm font-black" style={{ color: change24h >= 0 ? '#03A66D' : '#CF304A' }}>
              {fromPrice < 1 ? fromPrice.toFixed(5) : fromPrice.toLocaleString()}
            </span>
            <span className="text-xs" style={{ color: '#4B5563' }}>≈ {formatUSD(fromPrice)}</span>
          </div>
          {/* Bids (buys — green) */}
          {bids.map((r, i) => (
            <div key={`b${i}`} className="relative grid grid-cols-3 px-4 py-1 text-xs hover:opacity-80 cursor-pointer">
              <div className="absolute right-0 top-0 h-full rounded-l-sm" style={{ width: `${20 + (7-i) * 8}%`, background: 'rgba(3,166,109,0.06)' }} />
              <span className="font-semibold z-10" style={{ color: '#03A66D' }}>{r.price}</span>
              <span className="text-right z-10" style={{ color: '#848E9C' }}>{r.qty}</span>
              <span className="text-right z-10" style={{ color: '#4B5563' }}>{r.total}</span>
            </div>
          ))}
        </div>

        {/* ── Center: Swap Form ──────────── */}
        <div className="space-y-3">
          {/* Success */}
          {success && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(3,166,109,0.08)', border: '1px solid rgba(3,166,109,0.25)' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#03A66D' }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#03A66D' }}>Swap Executed!</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: '#4B5563' }}>TX: {success.txHash.slice(0, 22)}...</p>
              </div>
              <button onClick={() => setSuccess(null)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.25)' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#CF304A' }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#CF304A' }}>Trade Failed</p>
                <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>{error}</p>
              </div>
              <button onClick={() => setError(null)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Swap Card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            {/* Card Header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
              <div className="flex gap-1">
                {['Convert','Limit'].map((t, i) => (
                  <button key={t} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: i === 0 ? 'rgba(240,185,11,0.12)' : 'transparent', color: i === 0 ? '#F0B90B' : '#5D6673', border: i === 0 ? '1px solid rgba(240,185,11,0.2)' : '1px solid transparent' }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSettings(s => !s)} className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background: showSettings ? 'rgba(240,185,11,0.1)' : '#151A1F', border: '1px solid #2B3139', color: '#848E9C' }}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {/* From */}
              <div className="rounded-xl p-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>From</span>
                  <span className="text-xs" style={{ color: '#4B5563' }}>≈ {formatUSD(amountInUSD)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                         style={{ background: `${TOKEN_COLORS[fromToken]}18`, color: TOKEN_COLORS[fromToken] }}>
                      {fromToken[0]}
                    </div>
                    <SelectSheet
                      value={fromToken}
                      onChange={setFromToken}
                      title="Select From Token"
                      options={TOKENS.map(t => ({ value: t, label: t, color: TOKEN_COLORS[t] || '#EAECEF' }))}
                    />
                  </div>
                  <input type="text" inputMode="decimal" value={amountIn} onChange={e => {
                    setAmountIn(e.target.value);
                  }}
                         placeholder="0.00" 
                         className="flex-1 text-right text-2xl font-black outline-none allow-select"
                         style={{ color: '#EAECEF', minWidth: '100px', background: 'transparent', cursor: 'text' }} />
                </div>
                {/* Quick % buttons */}
                <div className="flex gap-1.5 mt-3">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => {
                      const wallet = wallets.find(w => w.token_symbol === fromToken);
                      if (wallet && wallet.balance) {
                        const amt = wallet.balance * (pct / 100);
                        setAmountIn(amt.toFixed(6));
                      }
                    }} className="flex-1 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                            style={{ background: 'rgba(240,185,11,0.06)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.15)' }}>
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Flip */}
              <div className="flex justify-center">
                <button onClick={handleFlip} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-180"
                        style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#F0B90B' }}>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* To */}
              <div className="rounded-xl p-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: '#4B5563' }}>To (estimated)</span>
                  <span className="text-xs" style={{ color: '#4B5563' }}>≈ {formatUSD(amountOut * toPrice)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                         style={{ background: `${TOKEN_COLORS[toToken]}18`, color: TOKEN_COLORS[toToken] }}>
                      {toToken[0]}
                    </div>
                    <SelectSheet
                      value={toToken}
                      onChange={setToToken}
                      title="Select To Token"
                      options={TOKENS.filter(t => t !== fromToken).map(t => ({ value: t, label: t, color: TOKEN_COLORS[t] || '#EAECEF' }))}
                    />
                  </div>
                  <div className="flex-1 text-right text-2xl font-black" style={{ color: amountOut > 0 ? '#03A66D' : '#4B5563' }}>
                    {amountOut > 0 ? amountOut.toFixed(6) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Rate + details */}
              {amountInNum > 0 && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                  {[
                    { label: 'Rate',          val: `1 ${fromToken} = ${exchangeRate.toFixed(4)} ${toToken}`, accent: false },
                    { label: 'Fee (0.1%)',     val: formatUSD(feeUSD),                                        accent: false },
                    { label: 'Price Impact',  val: `${priceImpact.toFixed(2)}%`,                             accent: priceImpact > 0.3 },
                    { label: 'Min. Received', val: `${minReceived.toFixed(6)} ${toToken}`,                   accent: false },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-xs">
                      <span style={{ color: '#4B5563' }}>{r.label}</span>
                      <span className="font-semibold" style={{ color: r.accent ? '#CF304A' : '#848E9C' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Slippage Settings (collapsible) */}
              {showSettings && (
                <div className="rounded-xl p-4" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                  <span className="text-xs font-bold mb-3 block" style={{ color: '#848E9C' }}>Slippage Tolerance</span>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0, 3.0].map(s => (
                      <button key={s} onClick={() => setSlippage(s)}
                              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                              style={{ background: slippage === s ? 'rgba(240,185,11,0.15)' : '#1E2329', color: slippage === s ? '#F0B90B' : '#848E9C', border: `1px solid ${slippage === s ? 'rgba(240,185,11,0.3)' : '#2B3139'}` }}>
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Risk */}
              {riskResult && (
                <div className="rounded-xl p-3" style={{ background: riskResult.level === 'CRITICAL' ? 'rgba(207,48,74,0.06)' : '#151A1F', border: `1px solid ${riskResult.level === 'CRITICAL' ? 'rgba(207,48,74,0.3)' : '#2B3139'}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#F0B90B' }} />
                      <span className="text-xs font-bold" style={{ color: '#848E9C' }}>AI Risk Engine</span>
                    </div>
                    <RiskBadge level={riskResult.level} score={riskResult.score} showScore />
                  </div>
                  {riskResult.reasons.length > 0 && (
                    <ul className="space-y-1">
                      {riskResult.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#CF304A' }}>
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Execute */}
              <button onClick={() => amountInNum > 0 && setShowConfirm(true)}
                      disabled={!amountIn || amountInNum <= 0}
                      className="w-full py-4 rounded-xl text-base font-black text-black gold-gradient atheer-gold-glow transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                {fromToken === toToken ? 'Select different tokens' : amountIn ? `Swap ${fromToken} → ${toToken}` : 'Enter Amount'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Pair Info + Recent Trades ──────────── */}
        <div className="space-y-4">
          {/* Pair Stats */}
          <div className="rounded-2xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                   style={{ background: `${TOKEN_COLORS[fromToken]}18`, color: TOKEN_COLORS[fromToken] }}>{fromToken[0]}</div>
              <div>
                <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{fromToken}/{toToken}</div>
                <div className="text-xs" style={{ color: '#4B5563' }}>Instant conversion</div>
              </div>
              <ChainBadge chain={TOKEN_CHAINS[fromToken]} size="xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Price',   val: `$${fromPrice < 1 ? fromPrice.toFixed(5) : fromPrice.toLocaleString()}` },
                { label: '24h %',   val: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`, color: change24h >= 0 ? '#03A66D' : '#CF304A' },
                { label: '24h Vol', val: '$2.4B' },
                { label: 'Fee',     val: '0.10%' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2.5" style={{ background: '#151A1F' }}>
                  <p className="text-xs mb-1" style={{ color: '#4B5563' }}>{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: s.color || '#EAECEF' }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="px-4 py-3 text-xs font-bold" style={{ color: '#EAECEF', borderBottom: '1px solid #2B3139' }}>
              Recent Trades
            </div>
            <div className="grid grid-cols-3 px-4 py-2 text-xs font-semibold" style={{ color: '#3B4149', borderBottom: '1px solid #1A1F26' }}>
              <span>Price</span><span className="text-right">Qty</span><span className="text-right">Time</span>
            </div>
            {recentTrades.map((r, i) => {
              return (
                <div key={i} className="grid grid-cols-3 px-4 py-1.5 text-xs hover:opacity-80"
                     style={{ borderBottom: '1px solid #1A1F26' }}>
                  <span className="font-semibold" style={{ color: r.side === 'buy' ? '#03A66D' : '#CF304A' }}>{r.price}</span>
                  <span className="text-right" style={{ color: '#848E9C' }}>{r.qty}</span>
                  <span className="text-right" style={{ color: '#4B5563' }}>{r.time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ───────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
              <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>Confirm Swap</h3>
              <button onClick={() => setShowConfirm(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Visual swap */}
              <div className="rounded-xl p-4 text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="text-2xl font-black" style={{ color: '#EAECEF' }}>{amountInNum} {fromToken}</div>
                <div className="text-xs my-1" style={{ color: '#4B5563' }}>≈ {formatUSD(amountInUSD)}</div>
                <ArrowUpDown className="w-5 h-5 mx-auto my-2" style={{ color: '#F0B90B' }} />
                <div className="text-2xl font-black" style={{ color: '#03A66D' }}>{amountOut.toFixed(6)} {toToken}</div>
                <div className="text-xs mt-1" style={{ color: '#4B5563' }}>Min. {minReceived.toFixed(6)} {toToken}</div>
              </div>
              <div className="space-y-2">
                {[
                  { l: 'Rate',    v: `1 ${fromToken} = ${exchangeRate.toFixed(4)} ${toToken}` },
                  { l: 'Fee',     v: formatUSD(feeUSD) },
                  { l: 'Slippage',v: `${slippage}%` },
                ].map(r => (
                  <div key={r.l} className="flex justify-between text-sm">
                    <span style={{ color: '#4B5563' }}>{r.l}</span>
                    <span className="font-semibold" style={{ color: '#848E9C' }}>{r.v}</span>
                  </div>
                ))}
                {riskResult && (
                  <div className="flex items-center justify-between rounded-lg p-2.5" style={{ background: '#151A1F' }}>
                    <span className="text-xs" style={{ color: '#4B5563' }}>AI Risk</span>
                    <RiskBadge level={riskResult.level} score={riskResult.score} showScore />
                  </div>
                )}
              </div>
              <button onClick={handleExecute} disabled={executing}
                      className="w-full py-3.5 rounded-xl font-black text-black gold-gradient flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                {executing ? <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</> : <><Zap className="w-4 h-4" /> Confirm Swap</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
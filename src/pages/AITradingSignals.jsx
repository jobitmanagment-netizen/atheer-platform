import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { Brain, RefreshCw, TrendingUp, TrendingDown, Loader2, Sparkles, Target, Shield, ArrowRight, Activity } from 'lucide-react';

const SIGNAL_CONFIG = {
  STRONG_BUY: { color: '#03A66D', bg: 'rgba(3,166,109,0.15)', label: 'STRONG BUY', icon: TrendingUp },
  BUY:        { color: '#0EA66D', bg: 'rgba(3,166,109,0.10)', label: 'BUY',        icon: TrendingUp },
  HOLD:       { color: '#F0B90B', bg: 'rgba(240,185,11,0.12)', label: 'HOLD',       icon: Activity },
  SELL:       { color: '#CF304A', bg: 'rgba(207,48,74,0.10)', label: 'SELL',       icon: TrendingDown },
  STRONG_SELL:{ color: '#FF0013', bg: 'rgba(255,0,19,0.15)',  label: 'STRONG SELL',icon: TrendingDown },
};

const SENTIMENT_CONFIG = {
  EXTREME_FEAR:  { color: '#CF304A', label: 'EXTREME FEAR' },
  FEAR:          { color: '#CF304A', label: 'FEAR' },
  NEUTRAL:       { color: '#F0B90B', label: 'NEUTRAL' },
  GREED:         { color: '#03A66D', label: 'GREED' },
  EXTREME_GREED: { color: '#03A66D', label: 'EXTREME GREED' },
};

export default function AITradingSignals() {
  const { userProfile } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ccs.functions.invoke('aiTradingSignals', {});
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchSignals, 120000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const sentiment = data?.market_sentiment || 'NEUTRAL';
  const sentimentCfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL;
  const fearGreed = data?.fear_greed_index || 50;

  const buySignals = (data?.signals || []).filter(s => s.signal === 'STRONG_BUY' || s.signal === 'BUY');
  const sellSignals = (data?.signals || []).filter(s => s.signal === 'STRONG_SELL' || s.signal === 'SELL');

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(130,71,229,0.12)' }}>
            <Brain className="w-5 h-5" style={{ color: '#8247E5' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black" style={{ color: '#EAECEF' }}>AI Trading Signals</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse" style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>AI-powered market analysis · auto-refresh 2min</p>
          </div>
        </div>
        <button onClick={fetchSignals} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: 'rgba(130,71,229,0.12)', color: '#8247E5', border: '1px solid rgba(130,71,229,0.2)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#8247E5' }} />
          <p className="text-sm mt-4 font-semibold" style={{ color: '#848E9C' }}>AI analyzing market data…</p>
          <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Processing RSI, MACD & moving averages</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-sm font-bold" style={{ color: '#CF304A' }}>Failed to generate signals</p>
          <p className="text-xs mt-1" style={{ color: '#848E9C' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* ── Market Sentiment Banner ──────────────────────── */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #1a1f26 0%, #0f1419 100%)', border: '1px solid #2B3139' }}>
            <div className="absolute right-0 top-0 w-72 h-full pointer-events-none"
                 style={{ background: `radial-gradient(ellipse at right, ${sentimentCfg.color}15 0%, transparent 70%)` }} />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#8247E5' }} />
                  <span className="text-sm font-bold" style={{ color: '#848E9C' }}>Market Sentiment</span>
                </div>
                <div className="text-2xl font-black" style={{ color: sentimentCfg.color }}>{sentimentCfg.label}</div>
                <p className="text-xs mt-2 max-w-md leading-relaxed" style={{ color: '#848E9C' }}>
                  {data?.summary || 'AI analysis in progress.'}
                </p>
              </div>

              {/* Fear & Greed Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1A1F26" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={sentimentCfg.color} strokeWidth="8"
                            strokeDasharray={`${(fearGreed/100)*251.2} 251.2`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black" style={{ color: '#EAECEF' }}>{Math.round(fearGreed)}</span>
                    <span className="text-xs" style={{ color: '#4B5563' }}>/ 100</span>
                  </div>
                </div>
                <span className="text-xs font-bold mt-1" style={{ color: '#848E9C' }}>Fear & Greed</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="relative z-10 grid grid-cols-3 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid #2B3139' }}>
              <div>
                <p className="text-xs" style={{ color: '#4B5563' }}>Buy Signals</p>
                <p className="text-xl font-black" style={{ color: '#03A66D' }}>{buySignals.length}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#4B5563' }}>Neutral / Hold</p>
                <p className="text-xl font-black" style={{ color: '#F0B90B' }}>{(data?.signals || []).length - buySignals.length - sellSignals.length}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#4B5563' }}>Sell Signals</p>
                <p className="text-xl font-black" style={{ color: '#CF304A' }}>{sellSignals.length}</p>
              </div>
            </div>
          </div>

          {/* ── Signal Cards Grid ────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.signals || []).map((s) => {
              const cfg = SIGNAL_CONFIG[s.signal] || SIGNAL_CONFIG.HOLD;
              const SignalIcon = cfg.icon;
              return (
                <div key={s.token} className="rounded-2xl p-5 transition-all hover:scale-[1.01]"
                     style={{ background: '#1E2329', border: `1px solid ${cfg.color}33`, borderTop: `3px solid ${cfg.color}` }}>
                  {/* Token header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
                           style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }}>{s.token[0]}</div>
                      <div>
                        <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{s.token}/USDT</div>
                        <div className="text-xs" style={{ color: s.change_24h >= 0 ? '#03A66D' : '#CF304A' }}>
                          {s.change_24h >= 0 ? '+' : ''}{s.change_24h}%
                        </div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      <SignalIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Current price + confidence */}
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-xs" style={{ color: '#4B5563' }}>Price</p>
                      <p className="text-xl font-black" style={{ color: '#EAECEF' }}>
                        ${s.current_price < 1 ? s.current_price?.toFixed(5) : s.current_price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: '#4B5563' }}>Confidence</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: '#2B3139' }}>
                          <div className="h-full rounded-full" style={{ width: `${s.confidence}%`, background: cfg.color }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{s.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Entry / Target / Stop Loss */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg p-2.5" style={{ background: '#151A1F' }}>
                      <div className="flex items-center gap-1 mb-1">
                        <ArrowRight className="w-2.5 h-2.5" style={{ color: '#848E9C' }} />
                        <span className="text-xs" style={{ color: '#4B5563' }}>Entry</span>
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#EAECEF' }}>
                        ${s.entry_price < 1 ? s.entry_price?.toFixed(5) : s.entry_price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg p-2.5" style={{ background: 'rgba(3,166,109,0.06)' }}>
                      <div className="flex items-center gap-1 mb-1">
                        <Target className="w-2.5 h-2.5" style={{ color: '#03A66D' }} />
                        <span className="text-xs" style={{ color: '#4B5563' }}>Target</span>
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#03A66D' }}>
                        ${s.target_price < 1 ? s.target_price?.toFixed(5) : s.target_price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg p-2.5" style={{ background: 'rgba(207,48,74,0.06)' }}>
                      <div className="flex items-center gap-1 mb-1">
                        <Shield className="w-2.5 h-2.5" style={{ color: '#CF304A' }} />
                        <span className="text-xs" style={{ color: '#4B5563' }}>Stop</span>
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#CF304A' }}>
                        ${s.stop_loss < 1 ? s.stop_loss?.toFixed(5) : s.stop_loss?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* R/R Ratio + RSI */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#4B5563' }}>R/R</span>
                      <span className="font-bold" style={{ color: s.risk_reward_ratio >= 2 ? '#03A66D' : '#F0B90B' }}>
                        1:{s.risk_reward_ratio?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#4B5563' }}>RSI</span>
                      <span className="font-bold" style={{ color: s.rsi > 70 ? '#CF304A' : s.rsi < 30 ? '#03A66D' : '#848E9C' }}>
                        {s.rsi}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#4B5563' }}>TF</span>
                      <span className="font-bold" style={{ color: '#848E9C' }}>{s.timeframe || '4h'}</span>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  <div className="rounded-lg p-3" style={{ background: 'rgba(130,71,229,0.06)', border: '1px solid rgba(130,71,229,0.1)' }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Brain className="w-3 h-3" style={{ color: '#8247E5' }} />
                      <span className="text-xs font-bold" style={{ color: '#8247E5' }}>AI Analysis</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>{s.reasoning || 'No analysis available.'}</p>
                  </div>

                  {/* Trade button */}
                  {(s.signal === 'STRONG_BUY' || s.signal === 'BUY' || s.signal === 'SELL' || s.signal === 'STRONG_SELL') && (
                    <Link to="/swap" className="block w-full text-center py-2 mt-3 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                      Execute Trade →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Disclaimer ────────────────────────────────────── */}
          <div className="rounded-xl p-4 text-center" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
            <p className="text-xs" style={{ color: '#4B5563' }}>
              ⚠️ AI signals are for informational purposes only and do not constitute financial advice. Always do your own research (DYOR).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
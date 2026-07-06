import { useState, useEffect, useCallback } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { CandlestickChart as ChartIcon, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import SelectSheet from '@/components/ccs/SelectSheet';

const TOKENS = [
  { value: 'BTC', label: 'BTC', color: '#F7931A' },
  { value: 'ETH', label: 'ETH', color: '#627EEA' },
  { value: 'BNB', label: 'BNB', color: '#F0B90B' },
  { value: 'TRX', label: 'TRX', color: '#FF0013' },
  { value: 'MATIC', label: 'MATIC', color: '#8247E5' },
  { value: 'SOL', label: 'SOL', color: '#14F195' },
  { value: 'XRP', label: 'XRP', color: '#23292F' },
  { value: 'ADA', label: 'ADA', color: '#0033AD' },
  { value: 'DOGE', label: 'DOGE', color: '#BA2F1B' },
  { value: 'AVAX', label: 'AVAX', color: '#E84142' },
  { value: 'LINK', label: 'LINK', color: '#2A5ADA' },
];

const TIMEFRAMES = [
  { value: '1', label: '24H' },
  { value: '7', label: '7D' },
  { value: '14', label: '14D' },
  { value: '30', label: '30D' },
];

// ── Custom Candlestick shape ──────────────────────────────────────────────────
// Reads pre-computed pixel positions (yHigh, yLow, yOpen, yClose) from payload
// to avoid relying on Recharts' internal yAxis.scale which may be undefined.
function CandlestickShape(props) {
  const { payload, x, width } = props;
  if (!payload || payload.yHigh == null) return null;
  const isUp = payload.close >= payload.open;
  const color = isUp ? '#03A66D' : '#CF304A';

  const { yOpen, yClose, yHigh, yLow } = payload;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
  const cx = x + width / 2;
  const bodyWidth = Math.max(width * 0.6, 2);

  return (
    <g>
      {/* Wick */}
      <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect
        x={cx - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
      />
    </g>
  );
}

// ── RSI Calculation ───────────────────────────────────────────────────────────
function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return [];
  const result = [];
  const changes = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }
  for (let i = period; i < changes.length; i++) {
    const gains = changes.slice(i - period + 1, i + 1).filter(c => c > 0);
    const losses = changes.slice(i - period + 1, i + 1).filter(c => c < 0);
    const avgGain = gains.reduce((s, g) => s + g, 0) / period;
    const avgLoss = Math.abs(losses.reduce((s, l) => s + l, 0) / period);
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i + 1].time, rsi: 100 - 100 / (1 + rs) });
  }
  return result;
}

// ── MACD Calculation ──────────────────────────────────────────────────────────
function calcEMA(values, period) {
  const k = 2 / (period + 1);
  const ema = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcMACD(candles) {
  if (candles.length < 26) return [];
  const closes = candles.map(c => c.close);
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return closes.map((_, i) => ({
    time: candles[i].time,
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: histogram[i],
  }));
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function CandlestickChart({ defaultToken = 'BTC', compact = false }) {
  const [token, setToken] = useState(defaultToken);
  const [days, setDays] = useState('7');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ccs.functions.invoke('getLiveMarketData', { token, days });
      const d = res.data || res;
      if (d?.error) throw new Error(d.error);
      if (d?.candles && d.candles.length > 0) {
        setData(d);
        setLoading(false);
        return;
      }
      throw new Error('No candle data returned');
    } catch (e) {
      logger.warn('CandlestickChart', 'Market data API failed', { token, error: e?.message || String(e) });
      setError('Market data unavailable');
      setData(null);
      setLoading(false);
      return;
    }
  }, [token, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const candles = data?.candles || [];
  const rsiData = calcRSI(candles);
  const macdData = calcMACD(candles);

  // Pre-compute y-pixel positions for candlestick rendering
  const CHART_H = 280, MARGIN_TOP = 5, MARGIN_BOTTOM = 0;
  const plotH = CHART_H - MARGIN_TOP - MARGIN_BOTTOM;
  const yMin = candles.length ? Math.min(...candles.map(c => c.low)) : 0;
  const yMax = candles.length ? Math.max(...candles.map(c => c.high)) : 1;
  const yRange = yMax - yMin || 1;
  const yScale = (val) => MARGIN_TOP + (1 - (val - yMin) / yRange) * plotH;

  const chartData = candles.map(c => ({
    ...c,
    timeLabel: formatTime(c.time),
    yHigh: yScale(c.high),
    yLow: yScale(c.low),
    yOpen: yScale(c.open),
    yClose: yScale(c.close),
  }));
  const rsiChart = rsiData.map(r => ({ ...r, timeLabel: formatTime(r.time) }));
  const macdChart = macdData.map(m => ({ ...m, timeLabel: formatTime(m.time) }));

  const price = data?.prices?.[token] || 0;
  const change = data?.changes?.[token] || 0;
  const isUp = change >= 0;

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3" style={{ borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(98,126,234,0.12)' }}>
            <ChartIcon className="w-4 h-4" style={{ color: '#627EEA' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black" style={{ color: '#EAECEF' }}>{token}/USD</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>LIVE</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black" style={{ color: isUp ? '#03A66D' : '#CF304A' }}>
                ${price < 1 ? price.toFixed(5) : price.toLocaleString()}
              </span>
              <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: isUp ? '#03A66D' : '#CF304A' }}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#0B0E11' }}>
            {TIMEFRAMES.map(tf => (
              <button key={tf.value} onClick={() => setDays(tf.value)}
                className="px-2.5 py-1 rounded-md text-xs font-bold transition-all"
                style={{
                  background: days === tf.value ? '#1E2329' : 'transparent',
                  color: days === tf.value ? '#F0B90B' : '#848E9C',
                }}>
                {tf.label}
              </button>
            ))}
          </div>
          {/* Token selector */}
          <SelectSheet
            value={token}
            onChange={setToken}
            title="Select Token"
            options={TOKENS}
          />
          <button onClick={fetchData} disabled={loading}
            className="p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F0B90B' }} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-sm" style={{ color: '#CF304A' }}>{error}</p>
          </div>
        ) : candles.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-sm" style={{ color: '#848E9C' }}>No candle data available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* OHLC Info Bar */}
            {lastCandle && (
              <div className="flex items-center gap-4 text-xs mb-3 px-1" style={{ color: '#848E9C' }}>
                <span>O: <b style={{ color: '#EAECEF' }}>${lastCandle.open.toFixed(2)}</b></span>
                <span>H: <b style={{ color: '#03A66D' }}>${lastCandle.high.toFixed(2)}</b></span>
                <span>L: <b style={{ color: '#CF304A' }}>${lastCandle.low.toFixed(2)}</b></span>
                <span>C: <b style={{ color: lastCandle.close >= lastCandle.open ? '#03A66D' : '#CF304A' }}>${lastCandle.close.toFixed(2)}</b></span>
              </div>
            )}

            {/* Main Candlestick Chart */}
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" vertical={false} />
                  <XAxis dataKey="timeLabel" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={{ stroke: '#2B3139' }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" width={60} tickFormatter={v => `$${v < 1 ? v.toFixed(3) : v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ background: '#0B0E11', border: '1px solid #2B3139', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#848E9C' }}
                    formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]}
                  />
                  <Bar dataKey="high" shape={<CandlestickShape />} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* RSI Indicator */}
            {!compact && (
              <>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="text-xs font-bold" style={{ color: '#8247E5' }}>RSI (14)</span>
                  {rsiData.length > 0 && (
                    <span className="text-xs font-bold" style={{ color: rsiData[rsiData.length - 1].rsi > 70 ? '#CF304A' : rsiData[rsiData.length - 1].rsi < 30 ? '#03A66D' : '#848E9C' }}>
                      {rsiData[rsiData.length - 1].rsi.toFixed(1)}
                      {rsiData[rsiData.length - 1].rsi > 70 ? ' (Overbought)' : rsiData[rsiData.length - 1].rsi < 30 ? ' (Oversold)' : ''}
                    </span>
                  )}
                </div>
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rsiChart} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" vertical={false} />
                      <XAxis dataKey="timeLabel" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} orientation="right" width={40} />
                      <ReferenceLine y={70} stroke="#CF304A" strokeDasharray="3 3" strokeOpacity={0.4} />
                      <ReferenceLine y={30} stroke="#03A66D" strokeDasharray="3 3" strokeOpacity={0.4} />
                      <Line type="monotone" dataKey="rsi" stroke="#8247E5" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Tooltip contentStyle={{ background: '#0B0E11', border: '1px solid #2B3139', borderRadius: 8, fontSize: 12 }} formatter={v => [Number(v).toFixed(1), 'RSI']} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* MACD Indicator */}
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="text-xs font-bold" style={{ color: '#627EEA' }}>MACD (12, 26, 9)</span>
                  {macdData.length > 0 && (
                    <span className="text-xs" style={{ color: macdData[macdData.length - 1].histogram >= 0 ? '#03A66D' : '#CF304A' }}>
                      {macdData[macdData.length - 1].histogram >= 0 ? '▲ Bullish' : '▼ Bearish'}
                    </span>
                  )}
                </div>
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={macdChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1F26" vertical={false} />
                      <XAxis dataKey="timeLabel" tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#4B5563', fontSize: 9 }} axisLine={false} tickLine={false} orientation="right" width={40} />
                      <ReferenceLine y={0} stroke="#2B3139" />
                      <Bar dataKey="histogram" isAnimationActive={false}>
                        {macdChart.map((entry, i) => (
                          <Cell key={i} fill={entry.histogram >= 0 ? 'rgba(3,166,109,0.6)' : 'rgba(207,48,74,0.6)'} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="macd" stroke="#627EEA" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="signal" stroke="#F0B90B" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Tooltip contentStyle={{ background: '#0B0E11', border: '1px solid #2B3139', borderRadius: 8, fontSize: 12 }} formatter={v => Number(v).toFixed(2)} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
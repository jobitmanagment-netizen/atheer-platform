import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Activity, TrendingUp, TrendingDown, DollarSign, BarChart3, Waves, Grid3x3, RefreshCw } from 'lucide-react';
import FearGreedGauge from '@/components/market/FearGreedGauge';
import MarketHeatmap from '@/components/market/MarketHeatmap';
import WhaleFeed from '@/components/market/WhaleFeed';

export default function MarketIntel() {
  const { userProfile } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await ccs.functions.invoke('getMarketIntelligence', { action: 'all' });
      setData(res?.data || res);
    } catch (e) { logger.error('MarketIntel', 'Failed to load market intelligence', { error: e?.message || String(e) }); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); const i = setInterval(loadData, 45000); return () => clearInterval(i); }, []);

  const fmt = (v) => {
    if (!v) return '$0';
    if (v >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v/1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />)}
    </div>
  );

  const advancing = data?.advancing || 0;
  const declining = data?.declining || 0;
  const total = advancing + declining || 1;
  const breadthPct = (advancing / total) * 100;

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: '#EAECEF' }}>Market Intelligence Terminal</h1>
          <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>Real-time market analytics & whale tracking</p>
        </div>
        <button onClick={loadData}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Market Sentiment', value: data?.fear_greed?.current || '—', sub: data?.fear_greed?.classification || '', color: '#F0B90B', icon: Activity },
          { label: 'BTC Dominance', value: `${data?.btc_dominance || '—'}%`, sub: `ETH: ${data?.eth_dominance || '—'}%`, color: '#627EEA', icon: BarChart3 },
          { label: '24h Volume', value: fmt(data?.market_cap_total), sub: `${data?.total_tracked || 0} pairs`, color: '#03A66D', icon: DollarSign },
          { label: 'Market Breadth', value: `${advancing}/${declining}`, sub: `${breadthPct.toFixed(0)}% advancing`, color: breadthPct > 50 ? '#03A66D' : '#CF304A', icon: TrendingUp },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${k.color}` }}>
            <k.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: k.color, opacity: 0.1 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Fear & Greed + Market Breadth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Fear & Greed Index</h3>
          <FearGreedGauge value={data?.fear_greed?.current || 50} classification={data?.fear_greed?.classification || 'Neutral'} />
          <div className="flex items-center gap-1.5 mt-4">
            {(data?.fear_greed?.history || []).map((h, i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                     style={{ background: h.value < 30 ? 'rgba(207,48,74,0.2)' : h.value < 70 ? 'rgba(240,185,11,0.2)' : 'rgba(3,166,109,0.2)',
                              color: h.value < 30 ? '#CF304A' : h.value < 70 ? '#F0B90B' : '#03A66D' }}>
                  {h.value}
                </div>
                <div className="text-[9px] mt-1" style={{ color: '#4B5563' }}>{h.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>Market Breadth</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold" style={{ color: '#03A66D' }}>▲ Advancing ({advancing})</span>
                <span className="font-semibold" style={{ color: '#CF304A' }}>▼ Declining ({declining})</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex">
                <div style={{ width: `${breadthPct}%`, background: '#03A66D' }} />
                <div style={{ width: `${100 - breadthPct}%`, background: '#CF304A' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
                <p className="text-lg font-black" style={{ color: '#EAECEF' }}>{data?.total_tracked || 0}</p>
                <p className="text-xs" style={{ color: '#848E9C' }}>Pairs Tracked</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
                <p className="text-lg font-black" style={{ color: '#627EEA' }}>{data?.btc_dominance || '—'}%</p>
                <p className="text-xs" style={{ color: '#848E9C' }}>BTC Dominance</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: '#151A1F' }}>
                <p className="text-lg font-black" style={{ color: '#F0B90B' }}>${(data?.btc_price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs" style={{ color: '#848E9C' }}>BTC Price</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Gainers / Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#03A66D' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Top Gainers</h3>
          </div>
          {(data?.top_gainers || []).slice(0, 8).map(t => (
            <div key={t.symbol} className="flex items-center justify-between px-5 py-2.5 text-xs hover:opacity-80"
                 style={{ borderBottom: '1px solid #1A1F26' }}>
              <span className="font-bold" style={{ color: '#EAECEF' }}>{t.symbol}</span>
              <span className="font-semibold" style={{ color: '#848E9C' }}>${t.price < 1 ? t.price.toFixed(5) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="font-black" style={{ color: '#03A66D' }}>+{t.change_pct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
            <TrendingDown className="w-4 h-4" style={{ color: '#CF304A' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Top Losers</h3>
          </div>
          {(data?.top_losers || []).slice(0, 8).map(t => (
            <div key={t.symbol} className="flex items-center justify-between px-5 py-2.5 text-xs hover:opacity-80"
                 style={{ borderBottom: '1px solid #1A1F26' }}>
              <span className="font-bold" style={{ color: '#EAECEF' }}>{t.symbol}</span>
              <span className="font-semibold" style={{ color: '#848E9C' }}>${t.price < 1 ? t.price.toFixed(5) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="font-black" style={{ color: '#CF304A' }}>{t.change_pct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Market Heatmap */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-4">
          <Grid3x3 className="w-4 h-4" style={{ color: '#627EEA' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Market Heatmap</h3>
        </div>
        <MarketHeatmap tokens={data?.heatmap} />
      </div>

      {/* Whale Feed + DeFi TVL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-4">
            <Waves className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Whale Movements</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded animate-pulse"
                  style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
          </div>
          <WhaleFeed whales={data?.whale_activity} />
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: '#8247E5' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>DeFi TVL Rankings</h3>
          </div>
          <div className="space-y-2">
            {(data?.defi_protocols || []).map(p => (
              <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg text-xs"
                   style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                <div>
                  <span className="font-bold" style={{ color: '#EAECEF' }}>{p.name}</span>
                  <span className="ml-2 text-xs" style={{ color: '#4B5563' }}>{p.chain}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold" style={{ color: '#EAECEF' }}>{fmt(p.tvl)}</span>
                  <span className="font-bold text-xs" style={{ color: p.change_24h >= 0 ? '#03A66D' : '#CF304A' }}>
                    {p.change_24h >= 0 ? '+' : ''}{p.change_24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg text-center" style={{ background: 'rgba(130,71,229,0.08)' }}>
            <span className="text-xs" style={{ color: '#848E9C' }}>Total DeFi TVL: </span>
            <span className="text-sm font-black" style={{ color: '#8247E5' }}>{fmt(data?.total_defi_tvl)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { TOKEN_PRICES, TOKEN_CHANGE_24H } from '@/lib/ccs-constants';

const TOKENS_DISPLAY = ['ETH', 'BNB', 'MATIC', 'TRX', 'USDT-TRC20'];

export default function LivePriceWidget() {
  const [market, setMarket] = useState({ prices: TOKEN_PRICES, changes: TOKEN_CHANGE_24H });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await ccs.functions.invoke('getLiveMarketData', { token: 'BTC', days: '1' });
      const d = res?.data || res;
      if (d?.prices) {
        setMarket({ prices: { ...TOKEN_PRICES, ...d.prices }, changes: { ...TOKEN_CHANGE_24H, ...d.changes } });
      } else {
        setMarket({ prices: TOKEN_PRICES, changes: TOKEN_CHANGE_24H });
      }
      setLastUpdate(new Date());
    } catch (error) {
      logger.warn('LivePriceWidget', 'Market refresh failed; keeping cached prices', { error: error?.message || String(error) });
      setMarket({ prices: TOKEN_PRICES, changes: TOKEN_CHANGE_24H });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#848E9C' }}>Live Prices</span>
        <button onClick={refresh} className="transition-all hover:opacity-70" style={{ color: '#848E9C' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="space-y-2.5">
        {TOKENS_DISPLAY.map(token => {
          const price = market.prices[token];
          const change = market.changes[token] ?? 0;
          const isUp = change >= 0;
          return (
            <div key={token} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                     style={{ background: token === 'USDT-TRC20' || token === 'TRX' ? 'rgba(255,0,19,0.15)' : 'rgba(240,185,11,0.12)', color: token === 'USDT-TRC20' || token === 'TRX' ? '#FF0013' : '#F0B90B' }}>
                  {token[0]}
                </div>
                <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{token}</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>
                  ${price < 1 ? price?.toFixed(5) : price?.toLocaleString()}
                </div>
                <div className={`flex items-center justify-end gap-0.5 text-xs`} style={{ color: isUp ? '#03A66D' : '#CF304A' }}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{change?.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 text-xs" style={{ borderTop: '1px solid #2B3139', color: '#4B5563' }}>
        Updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
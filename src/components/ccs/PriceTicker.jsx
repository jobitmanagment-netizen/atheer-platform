import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { TOKEN_PRICES, TOKEN_CHANGE_24H } from '@/lib/ccs-constants';

const TICKER_SYMBOLS = ['BTC', 'ETH', 'BNB', 'TRX', 'SOL', 'ADA', 'XRP', 'DOGE', 'AVAX', 'LINK', 'MATIC'];

export default function PriceTicker() {
  const [tokens, setTokens] = useState(
    TICKER_SYMBOLS.map(sym => ({ sym: `${sym}/USDT`, price: TOKEN_PRICES[sym] || 0, change: TOKEN_CHANGE_24H[sym] || 0 }))
  );

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await ccs.functions.invoke('getLiveMarketData', { token: 'BTC', days: '1' });
        const d = res?.data || res;
        if (d?.prices) {
          setTokens(TICKER_SYMBOLS.map(sym => ({
            sym: `${sym}/USDT`,
            price: d.prices[sym] || TOKEN_PRICES[sym] || 0,
            change: d.changes?.[sym] ?? TOKEN_CHANGE_24H[sym] ?? 0,
          })));
        } else {
          setTokens(TICKER_SYMBOLS.map(sym => ({
            sym: `${sym}/USDT`,
            price: TOKEN_PRICES[sym] || 0,
            change: TOKEN_CHANGE_24H[sym] || 0,
          })));
        }
      } catch (error) {
        logger.warn('PriceTicker', 'Live price fetch failed; using cached prices', { error: error?.message || String(error) });
        setTokens(TICKER_SYMBOLS.map(sym => ({
          sym: `${sym}/USDT`,
          price: TOKEN_PRICES[sym] || 0,
          change: TOKEN_CHANGE_24H[sym] || 0,
        })));
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const items = [...tokens, ...tokens];

  return (
    <div className="w-full overflow-hidden" style={{ background: '#0D1117', borderBottom: '1px solid #1E2329' }}>
      <div className="flex animate-ticker whitespace-nowrap py-1.5">
        {items.map((t, i) => {
          const isUp = t.change >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-bold" style={{ color: '#EAECEF' }}>{t.sym}</span>
              <span className="font-semibold" style={{ color: '#848E9C' }}>
                {t.price < 1 ? t.price.toFixed(5) : t.price.toLocaleString()}
              </span>
              <span className="font-bold" style={{ color: isUp ? '#03A66D' : '#CF304A' }}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{t.change.toFixed(2)}%
              </span>
              <span style={{ color: '#1E2329' }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
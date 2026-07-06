import { useEffect, useRef, memo } from 'react';

/**
 * Embedded TradingView Advanced Chart widget.
 * Loads the official tv.js library once and renders an interactive candlestick chart
 * for the given OKX-style symbol (e.g. "BTCUSDT" → "OKX:BTCUSDT").
 */
function TradingViewChart({ symbol = 'BTC', height = 420 }) {
  const containerRef = useRef(null);
  const containerId = useRef(`tv_chart_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const tvSymbol = `OKX:${symbol}USDT`;

    const render = () => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = '';
       
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: '15',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0B0E11',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: containerId.current,
        backgroundColor: '#0B0E11',
        gridColor: '#1E2329',
      });
    };

    if (window.TradingView) {
      render();
    } else {
      const existing = document.getElementById('tradingview-widget-script');
      if (existing) {
        existing.addEventListener('load', render);
      } else {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = render;
        document.body.appendChild(script);
      }
    }
  }, [symbol]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0B0E11', border: '1px solid #2B3139', height }}>
      <div id={containerId.current} ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default memo(TradingViewChart);
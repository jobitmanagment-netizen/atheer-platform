import { useState, useEffect, useCallback } from 'react';
import { ccs } from '@/api/ccsClient';
import { Layers, CheckCircle, AlertTriangle, X } from 'lucide-react';
import TradingViewChart from '@/components/trading/TradingViewChart';
import PairSelector from '@/components/trading/PairSelector';
import MarketStats from '@/components/trading/MarketStats';
import OrderBook from '@/components/trading/OrderBook';
import TradeFeed from '@/components/trading/TradeFeed';
import OrderForm from '@/components/trading/OrderForm';
import OpenOrders from '@/components/trading/OpenOrders';
import { useOKXLiveData } from '@/hooks/useOKXLiveData';

const TRADING_BALANCE = 10000;

export default function ProTrading() {
  const [symbol, setSymbol] = useState('BTC');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [priceData, setPriceData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [okxConfigured, setOkxConfigured] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [toast, setToast] = useState(null);

  const instId = `${symbol}-USDT`;

  // ── Live market data over OKX public WebSocket ──
  const { connected, ticker, orderBook, trades } = useOKXLiveData(instId);
  const livePrice = ticker?.price || priceData[symbol] || 0;

  // Live price in the browser tab title (Binance-style)
  useEffect(() => {
    if (livePrice) {
      const p = livePrice < 1 ? livePrice.toFixed(4) : livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 });
      document.title = `${p} | ${symbol}/USDT`;
    }
    return () => { document.title = 'CCS Technology'; };
  }, [livePrice, symbol]);

  const stats = ticker ? {
    change_percent: ticker.change_percent,
    high: ticker.high,
    low: ticker.low,
    volume: ticker.volume,
    symbol,
  } : null;

  const spread = orderBook.asks[0] && orderBook.bids[0]
    ? orderBook.asks[0].price - orderBook.bids[0].price : 0;

  // ── All pair prices for the selector bar (polled) ──
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await ccs.functions.invoke('getLiveMarketData', { type: 'all' });
        if (res?.data?.prices) {
          const pd = {};
          Object.entries(res.data.prices).forEach(([k, v]) => { pd[k] = v; });
          setPriceData(pd);
        }
      } catch (e) {
        // Keep the last known price snapshot when the market fetch fails.
      }
    };
    fetchAll();
    const allInterval = setInterval(fetchAll, 15000);
    return () => clearInterval(allInterval);
  }, []);

  // ── Real OKX open orders ──
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await ccs.functions.invoke('manageOKXOrders', { action: 'list' });
      const d = res.data || res;
      setOkxConfigured(d.okx_configured !== false);
      setOrders(d.orders || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const poll = setInterval(loadOrders, 12000);
    return () => clearInterval(poll);
  }, [loadOrders]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async () => {
    if (!amount) return;
    setSubmitting(true);
    try {
      const payload = {
        inst_id: instId,
        side,
        size: parseFloat(amount),
        order_type: orderType,
      };
      if (orderType === 'limit') payload.price = parseFloat(priceInput || livePrice);
      if (orderType === 'conditional') {
        payload.stop_price = parseFloat(stopPrice);
        if (priceInput) payload.price = parseFloat(priceInput);
      }
      if (orderType === 'oco') {
        payload.take_profit = parseFloat(takeProfit);
        payload.stop_price = parseFloat(stopPrice);
      }

      const res = await ccs.functions.invoke('executeOKXTrade', payload);
      const d = res.data || res;
      if (d.error) {
        if (d.okx_configured === false) setOkxConfigured(false);
        showToast('error', d.okx_error || d.error);
      } else {
        showToast('success', `${orderType.toUpperCase()} ${side} order placed · ID ${d.order?.order_id || ''}`);
        setAmount(''); setPriceInput(''); setStopPrice(''); setTakeProfit('');
        await loadOrders();
      }
    } catch (e) {
      showToast('error', e.message || 'Order failed');
    }
    setSubmitting(false);
  };

  const handleCancel = async (order) => {
    setCancellingId(order.order_id);
    try {
      const res = await ccs.functions.invoke('manageOKXOrders', {
        action: 'cancel',
        order_id: order.order_id,
        inst_id: order.inst_id,
        is_algo: order.is_algo,
      });
      const d = res.data || res;
      if (d.error) showToast('error', d.okx_error || d.error);
      else { showToast('success', 'Order cancelled'); await loadOrders(); }
    } catch (e) {
      showToast('error', e.message || 'Cancel failed');
    }
    setCancellingId(null);
  };

  return (
    <div className="p-4 space-y-3" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(98,126,234,0.12)', border: '1px solid rgba(98,126,234,0.25)' }}>
          <Layers className="w-5 h-5" style={{ color: '#627EEA' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Pro Trading</h1>
          <p className="text-xs" style={{ color: '#4B5563' }}>OCO · Stop-Limit · Live order book · TradingView chart</p>
        </div>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
              style={{ background: connected ? 'rgba(3,166,109,0.12)' : 'rgba(207,48,74,0.12)', color: connected ? '#03A66D' : '#CF304A' }}>
          <span className={connected ? 'animate-pulse' : ''}>●</span> {connected ? 'LIVE' : 'CONNECTING'}
        </span>
      </div>

      <PairSelector symbol={symbol} setSymbol={setSymbol} priceData={priceData} />
      <MarketStats livePrice={livePrice} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Chart + Order Book + Trades */}
        <div className="lg:col-span-7 space-y-3">
          <TradingViewChart symbol={symbol} height={420} />
          <div className="grid grid-cols-2 gap-3">
            <OrderBook orderBook={orderBook} livePrice={livePrice} spread={spread} />
            <TradeFeed trades={trades} />
          </div>
        </div>

        {/* Right: Order Form + Open Orders */}
        <div className="lg:col-span-5 space-y-3">
          <OrderForm
            symbol={symbol} side={side} setSide={setSide}
            orderType={orderType} setOrderType={setOrderType}
            amount={amount} setAmount={setAmount}
            priceInput={priceInput} setPriceInput={setPriceInput}
            stopPrice={stopPrice} setStopPrice={setStopPrice}
            takeProfit={takeProfit} setTakeProfit={setTakeProfit}
            livePrice={livePrice} handleSubmit={handleSubmit}
            submitting={submitting} balance={TRADING_BALANCE}
            okxConfigured={okxConfigured}
          />
          <OpenOrders
            orders={orders} onCancel={handleCancel}
            loading={ordersLoading} okxConfigured={okxConfigured}
            cancellingId={cancellingId}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl p-4 flex items-start gap-3 shadow-2xl animate-fade-in-up"
             style={{ background: '#1E2329', border: `1px solid ${toast.type === 'success' ? 'rgba(3,166,109,0.4)' : 'rgba(207,48,74,0.4)'}` }}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#03A66D' }} />
            : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#CF304A' }} />}
          <p className="text-sm flex-1" style={{ color: '#EAECEF' }}>{toast.message}</p>
          <button onClick={() => setToast(null)} style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
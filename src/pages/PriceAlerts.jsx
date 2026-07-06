import { useState, useEffect, useRef } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Bell, Plus, X, Loader2, TrendingUp, TrendingDown, BellRing, CheckCircle, Trash2 } from 'lucide-react';

const ALERT_TOKENS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TRX', 'MATIC'];
const STATIC_PRICES = { BTC: 103240, ETH: 3245, BNB: 612, SOL: 178, XRP: 0.5234, TRX: 0.1245, MATIC: 0.89 };

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [token, setToken] = useState('BTC');
  const [condition, setCondition] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [livePrices, setLivePrices] = useState(STATIC_PRICES);
  const [submitting, setSubmitting] = useState(false);

  // The polling interval closes over `alerts` at mount; mirror it in a ref so
  // checkAlerts always sees the latest alerts (including ones created later).
  const alertsRef = useRef([]);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  useEffect(() => {
    loadAlerts();
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await ccs.functions.invoke('getLiveMarketData', { type: 'all' });
      if (res?.data?.prices) {
        setLivePrices(res.data.prices);
        checkAlerts(res.data.prices);
      }
    } catch (e) { /* keep last known prices */ }
  };

  const checkAlerts = async (prices) => {
    let anyTriggered = false;
    for (const alert of alertsRef.current.filter(a => !a.is_triggered)) {
      const current = prices[alert.token] || STATIC_PRICES[alert.token] || 0;
      const triggered = alert.condition === 'above' ? current >= alert.target_price : current <= alert.target_price;
      if (triggered) {
        try {
          await ccs.entities.PriceAlert.update(alert.id, { is_triggered: true, current_price: current });
          anyTriggered = true;
        } catch (e) { /* ignore individual update failure and continue */ }
      }
    }
    // Refresh so triggered alerts move to the Triggered section immediately.
    if (anyTriggered) loadAlerts();
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const user = await ccs.auth.me();
      const a = await ccs.entities.PriceAlert.filter({ user_id: user.id }, '-created_date');
      setAlerts(a || []);
    } catch (e) { logger.error('PriceAlerts', 'Failed to load alerts', { error: e?.message || String(e) }); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!targetPrice) return;
    setSubmitting(true);
    try {
      const user = await ccs.auth.me();
      await ccs.entities.PriceAlert.create({
        user_id: user.id,
        token,
        target_price: parseFloat(targetPrice),
        condition,
        current_price: livePrices[token] || 0,
        is_triggered: false,
        notification_method: 'in_app',
      });
      setShowCreate(false);
      setTargetPrice('');
      await loadAlerts();
    } catch (e) { logger.error('PriceAlerts', 'Failed to create alert', { error: e?.message || String(e) }); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    await ccs.entities.PriceAlert.delete(id);
    await loadAlerts();
  };

  const activeAlerts = alerts.filter(a => !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.25)' }}>
            <Bell className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Price Alerts</h1>
            <p className="text-xs" style={{ color: '#4B5563' }}>Smart notifications · Get alerted when prices hit your targets</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
          <Plus className="w-4 h-4" /> Create Alert
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Alerts', value: activeAlerts.length, color: '#F0B90B', icon: Bell },
          { label: 'Triggered', value: triggeredAlerts.length, color: '#03A66D', icon: BellRing },
          { label: 'Total', value: alerts.length, color: '#627EEA', icon: Bell },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 relative overflow-hidden"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${s.color}` }}>
            <s.icon className="absolute right-3 top-3 w-8 h-8" style={{ color: s.color, opacity: 0.08 }} />
            <p className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{s.label}</p>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Live prices */}
      <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Live Prices</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse" style={{ background: 'rgba(3,166,109,0.12)', color: '#03A66D' }}>● LIVE</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {ALERT_TOKENS.map(t => (
            <div key={t} className="rounded-lg p-2.5 text-center" style={{ background: '#0B0E11', border: '1px solid #1E2329' }}>
              <div className="text-xs font-bold mb-1" style={{ color: '#848E9C' }}>{t}</div>
              <div className="text-sm font-black font-mono" style={{ color: '#EAECEF' }}>
                ${livePrices[t] < 1 ? livePrices[t]?.toFixed(4) : livePrices[t]?.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Active Alerts ({activeAlerts.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F0B90B' }} /></div>
        ) : activeAlerts.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: '#2B3139' }} />
            <p className="text-sm mb-1" style={{ color: '#EAECEF' }}>No active alerts</p>
            <p className="text-xs" style={{ color: '#848E9C' }}>Create an alert to get notified when prices hit your targets</p>
          </div>
        ) : (
          activeAlerts.map(alert => {
            const current = livePrices[alert.token] || STATIC_PRICES[alert.token] || 0;
            const progress = alert.condition === 'above'
              ? Math.min((current / alert.target_price) * 100, 100)
              : Math.min((alert.target_price / current) * 100, 100);
            return (
              <div key={alert.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: alert.condition === 'above' ? 'rgba(3,166,109,0.12)' : 'rgba(207,48,74,0.12)' }}>
                  {alert.condition === 'above'
                    ? <TrendingUp className="w-5 h-5" style={{ color: '#03A66D' }} />
                    : <TrendingDown className="w-5 h-5" style={{ color: '#CF304A' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{alert.token}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: alert.condition === 'above' ? 'rgba(3,166,109,0.12)' : 'rgba(207,48,74,0.12)', color: alert.condition === 'above' ? '#03A66D' : '#CF304A' }}>
                      {alert.condition === 'above' ? '↑ Above' : '↓ Below'} ${alert.target_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#4B5563' }}>
                    <span>Current: <span className="font-bold font-mono" style={{ color: '#EAECEF' }}>${current < 1 ? current.toFixed(4) : current.toLocaleString()}</span></span>
                    <span>Target: <span className="font-bold font-mono" style={{ color: alert.condition === 'above' ? '#03A66D' : '#CF304A' }}>${alert.target_price < 1 ? alert.target_price.toFixed(4) : alert.target_price.toLocaleString()}</span></span>
                  </div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: alert.condition === 'above' ? '#03A66D' : '#CF304A' }} />
                  </div>
                </div>
                <button onClick={() => handleDelete(alert.id)} className="p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(207,48,74,0.08)', color: '#CF304A' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Triggered Alerts ({triggeredAlerts.length})</h3>
          {triggeredAlerts.map(alert => (
            <div key={alert.id} className="rounded-xl p-4 flex items-center gap-4 opacity-75" style={{ background: 'rgba(3,166,109,0.06)', border: '1px solid rgba(3,166,109,0.15)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(3,166,109,0.12)' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#03A66D' }} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{alert.token}</span>
                <span className="text-xs ml-2" style={{ color: '#848E9C' }}>
                  {alert.condition === 'above' ? 'reached above' : 'dropped below'} ${alert.target_price.toLocaleString()}
                </span>
              </div>
              <span className="text-xs" style={{ color: '#4B5563' }}>{alert.created_date ? new Date(alert.created_date).toLocaleDateString() : ''}</span>
              <button onClick={() => handleDelete(alert.id)} className="p-2 rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'rgba(207,48,74,0.08)', color: '#CF304A' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Alert Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black" style={{ color: '#EAECEF' }}>Create Price Alert</h3>
              <button onClick={() => setShowCreate(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#848E9C' }}>Token</label>
              <div className="flex gap-1.5 flex-wrap">
                {ALERT_TOKENS.map(t => (
                  <button key={t} onClick={() => setToken(t)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: token === t ? 'rgba(240,185,11,0.12)' : '#0B0E11', color: token === t ? '#F0B90B' : '#848E9C', border: `1px solid ${token === t ? 'rgba(240,185,11,0.2)' : '#2B3139'}` }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#848E9C' }}>Condition</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setCondition('above')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                        style={{ background: condition === 'above' ? 'rgba(3,166,109,0.15)' : '#0B0E11', color: condition === 'above' ? '#03A66D' : '#848E9C', border: `1px solid ${condition === 'above' ? 'rgba(3,166,109,0.3)' : '#2B3139'}` }}>
                  <TrendingUp className="w-4 h-4" /> Above
                </button>
                <button onClick={() => setCondition('below')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                        style={{ background: condition === 'below' ? 'rgba(207,48,74,0.15)' : '#0B0E11', color: condition === 'below' ? '#CF304A' : '#848E9C', border: `1px solid ${condition === 'below' ? 'rgba(207,48,74,0.3)' : '#2B3139'}` }}>
                  <TrendingDown className="w-4 h-4" /> Below
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Target Price (USD)</label>
              <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                     placeholder={livePrices[token]?.toString() || '0.00'}
                     className="w-full px-3 py-3 rounded-xl text-sm outline-none font-mono"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              <p className="text-xs mt-1.5" style={{ color: '#4B5563' }}>
                Current {token} price: ${livePrices[token] < 1 ? livePrices[token]?.toFixed(4) : livePrices[token]?.toLocaleString()}
              </p>
            </div>

            <button onClick={handleCreate} disabled={!targetPrice || submitting}
                    className="w-full py-3 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #F0B90B, #FFCF40)' }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Alert'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
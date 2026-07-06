import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, TrendingUp, DollarSign, Activity, Shield } from 'lucide-react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';

const ICONS = {
  trade: DollarSign,
  price: TrendingUp,
  alert: AlertTriangle,
  security: Shield,
  system: Activity,
};

const COLORS = {
  trade: '#03A66D',
  price: '#F0B90B',
  alert: '#CF304A',
  security: '#627EEA',
  system: '#8247E5',
};

export default function NotificationCenter({ userProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const user = await ccs.auth.me();
      const [alerts, swaps, bankTxs] = await Promise.all([
        ccs.entities.ThreatAlert.list('-created_date', 20),
        ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 10),
        ccs.entities.BankTransaction.filter({ user_id: user.id }, '-created_date', 10),
      ]);
      const mappedAlerts = (alerts || []).map(a => ({
        id: a.id,
        type: 'alert',
        title: a.alert_type,
        message: a.message,
        severity: a.severity?.toLowerCase() || 'medium',
        created_date: a.created_date,
      }));
      const mappedSwaps = (swaps || []).slice(0, 5).map(s => ({
        id: s.id,
        type: 'trade',
        title: 'Trade Executed',
        message: `${s.from_token} → ${s.to_token} · ${s.amount_in} ${s.from_token}`,
        severity: 'success',
        created_date: s.created_date,
      }));
      const mappedTxs = (bankTxs || []).slice(0, 5).map(tx => ({
        id: tx.id,
        type: 'system',
        title: tx.type === 'deposit' ? 'Deposit Recorded' : 'Withdrawal Recorded',
        message: `${tx.currency} ${tx.amount} · ${tx.method || tx.direction || 'bank transfer'}`,
        severity: tx.status === 'failed' ? 'warning' : 'info',
        created_date: tx.created_date,
      }));
      setNotifications([...mappedAlerts, ...mappedSwaps, ...mappedTxs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 50));
    } catch (e) {
      logger.warn('NotificationCenter', 'No alerts loaded', { error: e?.message || String(e) });
    }
  };

  const markAsRead = async (id) => {
    try {
      const current = notifications.find((n) => n.id === id);
      if (current?.type === 'alert') {
        await ccs.entities.ThreatAlert.update(id, { is_read: true, status: 'acknowledged' });
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      logger.error('NotificationCenter', 'Failed to mark alert as read', { error: e?.message || String(e) });
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const markAllRead = () => {
    setNotifications([]);
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button onClick={() => setShowPanel(!showPanel)} className="relative p-2 rounded-lg transition-all"
              style={{ background: 'rgba(240,185,11,0.08)', color: '#F0B90B' }}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: '#CF304A' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="absolute right-0 top-12 w-96 max-h-[500px] flex flex-col rounded-2xl shadow-2xl z-50"
             style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold px-2 py-1 rounded"
                        style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowPanel(false)} style={{ color: '#848E9C' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-3 py-2" style={{ borderBottom: '1px solid #2B3139' }}>
            {['all', 'trade', 'price', 'alert', 'security'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: filter === f ? 'rgba(240,185,11,0.08)' : 'transparent', color: filter === f ? '#F0B90B' : '#848E9C' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 mb-3" style={{ color: '#2B3139' }} />
                <p className="text-sm font-semibold" style={{ color: '#848E9C' }}>No notifications</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#2B3139' }}>
                {filtered.map(n => {
                  const Icon = ICONS[n.type] || Bell;
                  const color = COLORS[n.type] || '#848E9C';
                  return (
                    <div key={n.id} className="p-3 hover:bg-white/5 transition-all cursor-pointer"
                         onClick={() => markAsRead(n.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ background: `${color}18`, color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{n.title}</h4>
                            <span className="text-xs" style={{ color: '#4B5563' }}>
                              {new Date(n.created_date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: '#848E9C' }}>{n.message}</p>
                          {n.severity && (
                            <span className="text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded"
                                  style={{ background: n.severity === 'critical' ? 'rgba(207,48,74,0.12)' : n.severity === 'warning' ? 'rgba(240,185,11,0.12)' : 'rgba(3,166,109,0.12)', color: n.severity === 'critical' ? '#CF304A' : n.severity === 'warning' ? '#F0B90B' : '#03A66D' }}>
                              {n.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
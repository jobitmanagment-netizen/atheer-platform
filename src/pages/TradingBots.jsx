import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Bot, Play, Pause, Trash2, Plus, X } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';

const BOT_TYPES = [
  { id: 'grid', name: 'Grid Bot', desc: 'Buy low, sell high in a range', color: '#03A66D' },
  { id: 'dca', name: 'DCA Bot', desc: 'Dollar-cost averaging', color: '#627EEA' },
  { id: 'martingale', name: 'Martingale', desc: 'Double down on losses', color: '#CF304A' },
  { id: 'rebalance', name: 'Rebalance', desc: 'Maintain portfolio balance', color: '#F0B90B' },
];

const PAIRS = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'SOL-USDT'];

export default function TradingBots() {
  const [bots, setBots] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ bot_name: '', bot_type: 'grid', symbol: 'BTC-USDT', allocation_usd: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBots(); }, []);

  const loadBots = async () => {
    try {
      logger.debug('TradingBots', 'Loading trading bots');
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) {
        logger.debug('TradingBots', 'User not authenticated while loading bots');
        setBots([]);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('TradingBots', 'Loading bots for user', { userId: user?.id });
      
      const b = await ccs.entities.TradingBot.filter({ user_id: user.id }, '-created_date');
      logger.debug('TradingBots', 'Bots loaded', { count: b?.length || 0 });
      setBots(b || []);
    } catch (e) {
      logger.error('TradingBots', 'Failed to load bots', { error: e?.message || String(e) });
      setBots([]);
    }
  };

  const handleCreate = async () => {
    logger.debug('TradingBots', 'handleCreate called', { bot_type: createForm.bot_type, symbol: createForm.symbol, allocation_usd: createForm.allocation_usd });
    if (!createForm.bot_type || createForm.bot_type.trim() === '') {
      logger.warn('TradingBots', 'Bot type validation failed', { bot_type: createForm.bot_type });
      alert('Please select a bot type');
      return;
    }
    if (!createForm.symbol || createForm.symbol.trim() === '') {
      logger.warn('TradingBots', 'Symbol validation failed', { symbol: createForm.symbol });
      alert('Please select a trading pair');
      return;
    }
    if (!createForm.allocation_usd || parseFloat(createForm.allocation_usd) <= 0) {
      logger.warn('TradingBots', 'Allocation validation failed', { allocation_usd: createForm.allocation_usd });
      alert('Please enter a valid allocation amount');
      return;
    }
    const allocation = parseFloat(createForm.allocation_usd);
    if (allocation < 10) {
      alert('Minimum allocation is 10 USDT');
      return;
    }
    logger.debug('TradingBots', 'Validation passed, creating bot');
    setSaving(true);
    try {
      const isAuthed = await ccs.auth.isAuthenticated();
      logger.debug('TradingBots', 'Authentication check completed', { isAuthed });
      if (!isAuthed) {
        alert('Please log in to create a trading bot');
        setSaving(false);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('TradingBots', 'Resolved current user', { userId: user?.id });
      if (!user || !user.id) {
        alert('Authentication failed. Please log in again.');
        setSaving(false);
        return;
      }
      
      const botData = {
        user_id: user.id,
        bot_name: createForm.bot_name || `${createForm.bot_type.toUpperCase()} Bot`,
        bot_type: createForm.bot_type,
        symbol: createForm.symbol,
        config: JSON.stringify({}),
        allocation_usd: allocation,
        pnl_usd: 0,
        pnl_percent: 0,
        trades_count: 0,
        status: 'running',
      };
      logger.debug('TradingBots', 'Creating bot', { bot_type: botData.bot_type, symbol: botData.symbol, allocation_usd: botData.allocation_usd });
      
      const bot = await ccs.entities.TradingBot.create(botData);
      logger.info('TradingBots', 'Bot created', { botId: bot?.id });
      
      if (!bot || !bot.id) {
        throw new Error('Bot creation returned invalid response');
      }
      
      try {
        await ccs.entities.AuditLog.create({
          user_id: user.id,
          action: 'BOT_CREATE',
          entity_type: 'TradingBot',
          details: `Created ${createForm.bot_type} bot for ${createForm.symbol} with ${allocation} USDT`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('TradingBots', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      
      alert(`✅ Bot created successfully!\n${createForm.bot_type.toUpperCase()} Bot for ${createForm.symbol}\nAllocation: ${formatUSD(allocation)}`);
      setShowCreate(false);
      setCreateForm({ bot_name: '', bot_type: 'grid', symbol: 'BTC-USDT', allocation_usd: '' });
      await loadBots();
    } catch (e) {
      logger.error('TradingBots', 'Failed to create bot', { error: e?.message || String(e) });
      alert('Failed to create bot: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleBot = async (bot) => {
    try {
      logger.debug('TradingBots', 'Toggling bot', { botId: bot.id, currentStatus: bot.status, nextStatus: bot.status === 'running' ? 'paused' : 'running' });
      await ccs.entities.TradingBot.update(bot.id, { status: bot.status === 'running' ? 'paused' : 'running' });
      logger.info('TradingBots', 'Bot toggled successfully', { botId: bot.id });
      try {
        await ccs.entities.AuditLog.create({
          user_id: bot.user_id,
          action: 'BOT_TOGGLE',
          entity_type: 'TradingBot',
          details: `${bot.bot_name} ${bot.status === 'running' ? 'paused' : 'resumed'}`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('TradingBots', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      await loadBots();
    } catch (e) {
      logger.error('TradingBots', 'Failed to toggle bot', { error: e?.message || String(e) });
      alert('Failed to update bot status.');
    }
  };

  const deleteBot = async (bot) => {
    if (!confirm(`Delete ${bot.bot_name}? This cannot be undone.`)) return;
    try {
      await ccs.entities.TradingBot.delete(bot.id);
      await ccs.entities.AuditLog.create({
        user_id: bot.user_id,
        action: 'BOT_DELETE',
        entity_type: 'TradingBot',
        details: `Deleted ${bot.bot_name}`,
        risk_level: 'SAFE',
      });
      await loadBots();
    } catch (e) {
      logger.error('TradingBots', 'Failed to delete bot', { error: e?.message || String(e) });
      alert('Failed to delete bot.');
    }
  };

  const totalAllocation = bots.reduce((s, b) => s + (b.allocation_usd || 0), 0);
  const totalPnl = bots.reduce((s, b) => s + (b.pnl_usd || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(130,71,229,0.12)', border: '1px solid rgba(130,71,229,0.25)' }}>
            <Bot className="w-5 h-5" style={{ color: '#8247E5' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>Trading Bots</h1>
            <p className="text-xs" style={{ color: '#848E9C' }}>Automate your trading strategies</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black gold-gradient">
          <Plus className="w-4 h-4" />
          Create Bot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Total Bots</div>
          <div className="text-2xl font-black" style={{ color: '#EAECEF' }}>{bots.length}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Total Allocation</div>
          <div className="text-2xl font-black" style={{ color: '#EAECEF' }}>{formatUSD(totalAllocation)}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Total PnL</div>
          <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatUSD(totalPnl)}</div>
        </div>
      </div>

      {/* Bots Grid */}
      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bot className="w-16 h-16 mb-4" style={{ color: '#2B3139' }} />
          <p className="font-semibold mb-1" style={{ color: '#EAECEF' }}>No bots yet</p>
          <p className="text-sm mb-4" style={{ color: '#848E9C' }}>Create your first trading bot</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-black gold-gradient">Create Bot</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map(bot => {
            const type = BOT_TYPES.find(t => t.id === bot.bot_type);
            return (
              <div key={bot.id} className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>{bot.bot_name}</h3>
                    <p className="text-xs" style={{ color: '#848E9C' }}>{bot.symbol}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${bot.status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{bot.status.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div><span style={{ color: '#848E9C' }}>Type: </span><span className="font-semibold" style={{ color: '#EAECEF' }}>{type?.name}</span></div>
                  <div><span style={{ color: '#848E9C' }}>Alloc: </span><span className="font-mono font-bold" style={{ color: '#EAECEF' }}>{formatUSD(bot.allocation_usd)}</span></div>
                  <div><span style={{ color: '#848E9C' }}>PnL: </span><span className={`font-mono font-bold ${bot.pnl_usd >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatUSD(bot.pnl_usd)} ({bot.pnl_percent >= 0 ? '+' : ''}{bot.pnl_percent.toFixed(2)}%)</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleBot(bot)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: bot.status === 'running' ? 'rgba(240,185,11,0.12)' : 'rgba(3,166,109,0.12)', color: bot.status === 'running' ? '#F0B90B' : '#03A66D' }}>
                    {bot.status === 'running' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {bot.status === 'running' ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => deleteBot(bot)} className="p-2 rounded-lg transition-all"
                          style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Create Trading Bot</h3>
              <button onClick={() => setShowCreate(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Bot Name</label>
                <input value={createForm.bot_name} onChange={e => setCreateForm(p => ({ ...p, bot_name: e.target.value }))}
                       placeholder="My Grid Bot" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Bot Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {BOT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setCreateForm(p => ({ ...p, bot_type: t.id }))}
                            className="p-3 rounded-lg text-xs text-left transition-all"
                            style={{ background: createForm.bot_type === t.id ? `${t.color}18` : '#0B0E11', border: `1px solid ${createForm.bot_type === t.id ? t.color : '#2B3139'}`, color: createForm.bot_type === t.id ? t.color : '#848E9C' }}>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-xs mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Trading Pair</label>
                <select value={createForm.symbol} onChange={e => setCreateForm(p => ({ ...p, symbol: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                  {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Allocation (USDT)</label>
                <input type="number" value={createForm.allocation_usd} onChange={e => setCreateForm(p => ({ ...p, allocation_usd: e.target.value }))}
                       placeholder="100" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>Cancel</button>
                <button onClick={handleCreate} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Bot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
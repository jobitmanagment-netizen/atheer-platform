import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Plus, Copy, Check, AlertTriangle, Power, Import, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import ChainBadge from '@/components/ccs/ChainBadge';
import PortfolioAllocation from '@/components/wallet/PortfolioAllocation';
import SelectSheet from '@/components/ccs/SelectSheet';
import WalletActionButtons from '@/components/ccs/WalletActionButtons';
import QRDepositModal from '@/components/ccs/QRDepositModal';
import SendWithdrawModal from '@/components/ccs/SendWithdrawModal';
import { generateWalletAddress, formatUSD, shortenAddress } from '@/lib/ai-risk-engine';
import { CHAIN_COLORS, TOKEN_PRICES, NETWORK_OPTIONS, CHAIN_TOKENS } from '@/lib/ccs-constants';

const CHAINS = ['ALL', 'ETH', 'BNB', 'POLY', 'TRON', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX'];

export default function Wallets() {
  const { userProfile } = useOutletContext() || {};
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [activeChain, setActiveChain] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [createForm, setCreateForm] = useState({ label: '', chain: 'ETH', token_symbol: 'ETH' });
  const [importForm, setImportForm] = useState({ label: '', address: '', chain: 'ETH' });
  const [saving, setSaving] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [sendWallet, setSendWallet] = useState(null);

  const loadWallets = async () => {
    try {
      logger.debug('Wallets', 'Loading wallets');
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) {
        logger.debug('Wallets', 'User not authenticated while loading wallets');
        setWallets([]);
        setSwaps([]);
        setLoading(false);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('Wallets', 'Loading wallets for user', { userId: user?.id });
      
      const [w, s] = await Promise.all([
        ccs.entities.Wallet.filter({ user_id: user.id }),
        ccs.entities.SwapOrder.filter({ user_id: user.id }, '-created_date', 20),
      ]);
      logger.debug('Wallets', 'Wallets loaded', { count: w?.length || 0 });
      setWallets(w || []);
      setSwaps(s || []);
    } catch (e) {
      logger.error('Wallets', 'Failed to load wallets', { error: e?.message || String(e) });
      setWallets([]);
      setSwaps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWallets(); }, []);

  const filtered = activeChain === 'ALL' ? wallets : wallets.filter(w => w.chain === activeChain);

  const handleCopy = (address, id) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    logger.debug('Wallets', 'handleCreate called', { chain: createForm.chain, token_symbol: createForm.token_symbol });
    if (!createForm.chain || createForm.chain.trim() === '') {
      alert('Please select a network');
      return;
    }
    if (!createForm.token_symbol || createForm.token_symbol.trim() === '') {
      alert('Please select a token');
      return;
    }
    logger.debug('Wallets', 'Validation passed, creating wallet');
    setSaving(true);
    try {
      // Check authentication first
      const isAuthed = await ccs.auth.isAuthenticated();
      logger.debug('Wallets', 'Authentication check completed', { isAuthed });
      if (!isAuthed) {
        alert('Please log in to create a wallet');
        setSaving(false);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('Wallets', 'Resolved current user', { userId: user?.id });
      if (!user || !user.id) {
        alert('Authentication failed. Please log in again.');
        setSaving(false);
        return;
      }
      
      const address = generateWalletAddress(createForm.chain);
      logger.debug('Wallets', 'Generated wallet address', { chain: createForm.chain });
      
      const balance = 0;
      const price = TOKEN_PRICES[createForm.token_symbol] || 1;
      const balanceUsd = parseFloat((balance * price).toFixed(2));
      
      const walletData = {
        user_id: user.id,
        label: createForm.label || `${createForm.chain} Wallet`,
        address,
        chain: createForm.chain,
        token_symbol: createForm.token_symbol,
        balance,
        balance_usd: balanceUsd,
        initial_balance_usd: balanceUsd,
        is_active: true,
      };
      logger.debug('Wallets', 'Creating wallet', { chain: walletData.chain, token_symbol: walletData.token_symbol });
      
      const newWallet = await ccs.entities.Wallet.create(walletData);
      logger.info('Wallets', 'Wallet created', { walletId: newWallet?.id });
      
      if (!newWallet || !newWallet.id) {
        throw new Error('Wallet creation returned invalid response');
      }
      
      // Create audit log (non-critical)
      try {
        await ccs.entities.AuditLog.create({
          user_id: user.id,
          action: 'CREATE_WALLET',
          entity_type: 'Wallet',
          details: `Created ${createForm.chain} wallet (${createForm.label || 'Unnamed'})`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('Wallets', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      
      alert(`✅ Wallet created successfully!\n${createForm.chain} - ${createForm.token_symbol}\nBalance: ${formatUSD(balanceUsd)}`);
      setShowCreate(false);
      setCreateForm({ label: '', chain: 'ETH', token_symbol: 'ETH' });
      await loadWallets();
    } catch (e) {
      logger.error('Wallets', 'Failed to create wallet', { error: e?.message || String(e) });
      alert('Failed to create wallet: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    logger.debug('Wallets', 'handleImport called', { chain: importForm.chain });
    if (!importForm.address || !importForm.chain) {
      alert('Please enter a wallet address and select a network');
      return;
    }
    try {
      setSaving(true);
      const isAuthed = await ccs.auth.isAuthenticated();
      if (!isAuthed) {
        alert('Please log in to import a wallet');
        setSaving(false);
        return;
      }
      
      const user = await ccs.auth.me();
      logger.debug('Wallets', 'Importing wallet for user', { userId: user?.id });
      
      const walletData = {
        user_id: user.id,
        label: importForm.label || `Imported ${importForm.chain}`,
        address: importForm.address,
        chain: importForm.chain,
        token_symbol: CHAIN_TOKENS[importForm.chain]?.[0] || 'ETH',
        balance: 0,
        balance_usd: 0,
        initial_balance_usd: 0,
        is_active: true,
      };
      logger.debug('Wallets', 'Creating imported wallet', { chain: walletData.chain, token_symbol: walletData.token_symbol });
      
      const newWallet = await ccs.entities.Wallet.create(walletData);
      logger.info('Wallets', 'Wallet imported', { walletId: newWallet?.id });
      
      if (!newWallet || !newWallet.id) {
        throw new Error('Wallet import returned invalid response');
      }
      
      try {
        await ccs.entities.AuditLog.create({
          user_id: user.id,
          action: 'IMPORT_WALLET',
          entity_type: 'Wallet',
          details: `Imported ${importForm.chain} wallet`,
          risk_level: 'SAFE',
        });
      } catch (auditErr) {
        logger.warn('Wallets', 'Audit log failed (non-critical)', { error: auditErr?.message || String(auditErr) });
      }
      
      alert(`✅ Wallet imported successfully!\n${importForm.chain}: ${importForm.address.slice(0, 10)}...`);
      setShowImport(false);
      setImportForm({ label: '', address: '', chain: 'ETH' });
      await loadWallets();
    } catch (e) {
      logger.error('Wallets', 'Failed to import wallet', { error: e?.message || String(e) });
      alert('Failed to import wallet: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleWallet = async (wallet) => {
    try {
      logger.debug('Wallets', 'Toggling wallet state', { walletId: wallet.id, nextActive: !wallet.is_active });
      await ccs.entities.Wallet.update(wallet.id, { is_active: !wallet.is_active });
      logger.info('Wallets', 'Wallet toggled successfully', { walletId: wallet.id });
      await loadWallets();
    } catch (e) {
      logger.error('Wallets', 'Failed to toggle wallet', { error: e?.message || String(e) });
      alert('Failed to update wallet status.');
    }
  };

  const totalBalanceUSD = wallets.reduce((s, w) => s + (w.balance_usd || 0), 0);
  const totalInitialUSD = wallets.reduce((s, w) => s + (w.initial_balance_usd || w.balance_usd || 0), 0);
  const pnlUSD = totalBalanceUSD - totalInitialUSD;
  const pnlPercent = totalInitialUSD > 0 ? (pnlUSD / totalInitialUSD) * 100 : 0;
  const chainCount = new Set(wallets.map(w => w.chain)).size;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.25)' }}>
            <Wallet className="w-5 h-5" style={{ color: '#F0B90B' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Wallets</h1>
            <p className="text-sm mt-1" style={{ color: '#848E9C' }}>{wallets.length} wallets across {chainCount} networks</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
                  style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}>
            <Import className="w-4 h-4" />
            Import
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-black gold-gradient">
            <Plus className="w-4 h-4" />
            New Wallet
          </button>
        </div>
      </div>

      {/* Portfolio PnL Banner */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1a1f26 0%, #0f1419 50%, #0d1117 100%)', border: '1px solid #1E2329' }}>
        <div className="absolute right-0 top-0 w-64 h-full pointer-events-none"
             style={{ background: `radial-gradient(ellipse at right, ${pnlUSD >= 0 ? 'rgba(3,166,109,0.06)' : 'rgba(207,48,74,0.06)'} 0%, transparent 70%)` }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-sm font-medium" style={{ color: '#848E9C' }}>Total Portfolio Value</span>
            <div className="text-3xl font-black mt-1" style={{ color: '#EAECEF', fontFamily: 'Inter, monospace' }}>{formatUSD(totalBalanceUSD)}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold flex items-center gap-1" style={{ color: pnlUSD >= 0 ? '#03A66D' : '#CF304A' }}>
                {pnlUSD >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {pnlUSD >= 0 ? '+' : ''}{formatUSD(pnlUSD)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
              </span>
              <span className="text-xs" style={{ color: '#4B5563' }}>All time PnL</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-1" style={{ color: '#848E9C' }}>Initial Investment</div>
            <div className="text-lg font-bold" style={{ color: '#848E9C' }}>{formatUSD(totalInitialUSD)}</div>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation */}
      {wallets.length > 0 && <PortfolioAllocation wallets={wallets} />}

      {/* Chain Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CHAINS.map(chain => {
          const color = chain === 'ALL' ? '#F0B90B' : CHAIN_COLORS[chain] || '#F0B90B';
          return (
            <button key={chain} onClick={() => setActiveChain(chain)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                background: activeChain === chain ? `${color}18` : '#1E2329',
                color: activeChain === chain ? color : '#848E9C',
                border: `1px solid ${activeChain === chain ? color + '44' : '#2B3139'}`,
              }}>
              {chain}
            </button>
          );
        })}
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="atheer-card p-5 animate-pulse h-48">
              <div className="h-4 rounded w-1/2 mb-3" style={{ background: '#2B3139' }} />
              <div className="h-6 rounded w-3/4 mb-2" style={{ background: '#2B3139' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#1E2329' }}>
            <Plus className="w-8 h-8" style={{ color: '#2B3139' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: '#EAECEF' }}>No wallets found</p>
          <p className="text-sm mb-4" style={{ color: '#848E9C' }}>Create your first wallet to get started</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-black gold-gradient">
            Create Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(wallet => {
            const color = CHAIN_COLORS[wallet.chain] || '#F0B90B';
            const isTRC20 = wallet.chain === 'TRON';
            const walletPnL = (wallet.balance_usd || 0) - (wallet.initial_balance_usd || wallet.balance_usd || 0);
            const walletPnLPct = (wallet.initial_balance_usd || 0) > 0 ? (walletPnL / wallet.initial_balance_usd) * 100 : 0;
            return (
              <div key={wallet.id}
                   className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
                   style={{
                     background: isTRC20 ? 'rgba(255,0,19,0.05)' : '#1E2329',
                     border: `1px solid ${isTRC20 ? 'rgba(255,0,19,0.25)' : '#2B3139'}`,
                     opacity: wallet.is_active ? 1 : 0.5,
                   }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold mb-1.5" style={{ color: '#EAECEF' }}>{wallet.label}</div>
                    <ChainBadge chain={wallet.chain} size="xs" />
                  </div>
                  <button onClick={() => toggleWallet(wallet)} className="text-xs px-2 py-1 rounded-md transition-all"
                          style={{ background: wallet.is_active ? 'rgba(3,166,109,0.1)' : 'rgba(207,48,74,0.1)', color: wallet.is_active ? '#03A66D' : '#CF304A' }}>
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="text-xl font-black mb-0.5" style={{ color: isTRC20 ? '#FF4444' : '#EAECEF', fontFamily: 'Inter, monospace' }}>
                    {formatUSD(wallet.balance_usd)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#848E9C' }}>{wallet.balance?.toFixed(4)} {wallet.token_symbol}</span>
                    {walletPnL !== 0 && (
                      <span className="text-xs font-bold" style={{ color: walletPnL >= 0 ? '#03A66D' : '#CF304A' }}>
                        {walletPnL >= 0 ? '+' : ''}{formatUSD(walletPnL)} ({walletPnLPct >= 0 ? '+' : ''}{walletPnLPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mb-3">
                  <WalletActionButtons
                    onDeposit={() => setDepositWallet(wallet)}
                    onSend={() => setSendWallet(wallet)}
                    onTransfer={() => setSendWallet(wallet)}
                    onHistory={() => navigate('/history')}
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #2B3139' }}>
                  <span className="text-xs font-mono" style={{ color: '#848E9C' }}>{shortenAddress(wallet.address)}</span>
                  <button onClick={() => handleCopy(wallet.address, wallet.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
                          style={{ background: 'rgba(240,185,11,0.08)', color: copiedId === wallet.id ? '#03A66D' : '#F0B90B' }}>
                    {copiedId === wallet.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedId === wallet.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Create New Wallet</h3>
              <button onClick={() => setShowCreate(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Wallet Label</label>
                <input value={createForm.label} onChange={e => setCreateForm(p => ({ ...p, label: e.target.value }))}
                       placeholder="My ETH Wallet"
                       className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Network</label>
                <div className="w-full px-3 py-2.5 rounded-lg text-sm outline-none flex items-center justify-between cursor-pointer"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                  <SelectSheet
                    value={createForm.chain}
                    onChange={(v) => {
                      setCreateForm(p => ({ ...p, chain: v, token_symbol: CHAIN_TOKENS[v]?.[0] || 'ETH' }));
                    }}
                    title="Select Network"
                    options={NETWORK_OPTIONS}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Token</label>
                <div className="w-full px-3 py-2.5 rounded-lg text-sm outline-none flex items-center justify-between cursor-pointer"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                  <SelectSheet
                    value={createForm.token_symbol}
                    onChange={(v) => {
                      setCreateForm(p => ({ ...p, token_symbol: v }));
                    }}
                    title="Select Token"
                    options={(CHAIN_TOKENS[createForm.chain] || ['ETH']).map(t => ({ value: t, label: t, color: '#F0B90B' }))}
                  />
                </div>
              </div>

              {createForm.chain === 'TRON' && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,0,19,0.08)', border: '1px solid rgba(255,0,19,0.2)' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FF0013' }} />
                  <p className="text-xs" style={{ color: '#FF4444' }}>
                    TRON wallets support USDT TRC20. Always verify the recipient address before transferring. TRC20 transfers are irreversible.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Import Wallet</h3>
              <button onClick={() => setShowImport(false)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Label</label>
                <input value={importForm.label} onChange={e => setImportForm(p => ({ ...p, label: e.target.value }))}
                       placeholder="My Imported Wallet" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Network</label>
                <div className="w-full px-3 py-2.5 rounded-lg text-sm outline-none flex items-center"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                  <SelectSheet
                    value={importForm.chain}
                    onChange={(v) => setImportForm(p => ({ ...p, chain: v }))}
                    title="Select Network"
                    options={NETWORK_OPTIONS}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Wallet Address</label>
                <input value={importForm.address} onChange={e => setImportForm(p => ({ ...p, address: e.target.value }))}
                       placeholder={importForm.chain === 'TRON' ? 'T...' : importForm.chain === 'SOL' ? 'Solana base58...' : '0x...'}
                       className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                       style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowImport(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>Cancel</button>
                <button onClick={handleImport} disabled={!importForm.address || saving}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient disabled:opacity-50">
                  {saving ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit QR Modal */}
      {depositWallet && (
        <QRDepositModal wallet={depositWallet} onClose={() => setDepositWallet(null)} />
      )}

      {/* Send/Withdraw Modal */}
      {sendWallet && (
        <SendWithdrawModal
          wallet={sendWallet}
          userSwaps={swaps}
          onClose={() => setSendWallet(null)}
          onSuccess={loadWallets}
        />
      )}
    </div>
  );
}
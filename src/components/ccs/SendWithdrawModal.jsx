import { useState } from 'react';
import { X, ArrowUpRight, AlertTriangle, Loader2, Check } from 'lucide-react';
import { ccs } from '@/api/ccsClient';
import { CHAIN_COLORS, TOKEN_PRICES } from '@/lib/ccs-constants';
import { calculateRisk, generateTxHash, generateTronHash } from '@/lib/ai-risk-engine';
import SelectSheet from '@/components/ccs/SelectSheet';

export default function SendWithdrawModal({ wallet, userSwaps, onClose, onSuccess }) {
  const [mode, setMode] = useState('address'); // 'address' | 'internal'
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientWalletId, setRecipientWalletId] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  if (!wallet) return null;

  const color = CHAIN_COLORS[wallet.chain] || '#F0B90B';
  const maxAmount = wallet.balance || 0;
  const amountNum = parseFloat(amount) || 0;
  const price = TOKEN_PRICES[wallet.token_symbol] || 0;
  const usdValue = amountNum * price;

  const handleSend = async () => {
    setError('');
    if (mode === 'address' && !toAddress.trim()) { setError('Enter a destination address'); return; }
    if (mode === 'internal' && !recipientWalletId) { setError('Select a recipient wallet'); return; }
    if (amountNum <= 0) { setError('Enter a valid amount'); return; }
    if (amountNum > maxAmount) { setError('Insufficient balance'); return; }

    setSending(true);
    try {
      const user = await ccs.auth.me();
      const risk = calculateRisk({
        amountUSD: usdValue,
        recentSwapsCount: userSwaps?.length || 0,
        chain: wallet.chain,
        fromToken: wallet.token_symbol,
      });
      const isTRON = wallet.chain === 'TRON';
      const txHash = isTRON ? generateTronHash() : generateTxHash();

      // Create swap order as withdrawal record
      await ccs.entities.SwapOrder.create({
        user_id: user.id,
        from_token: wallet.token_symbol,
        to_token: 'WITHDRAWAL',
        from_chain: wallet.chain,
        to_chain: mode === 'internal' ? 'INTERNAL' : wallet.chain,
        amount_in: amountNum,
        amount_out: 0,
        amount_in_usd: usdValue,
        fee_usd: usdValue * 0.001,
        slippage_percent: 0,
        price_impact: 0,
        status: 'completed',
        risk_level: risk.level,
        risk_score: risk.score,
        risk_reasons: JSON.stringify(risk.reasons),
        tx_hash: txHash,
      });

      // Log audit
      await ccs.entities.AuditLog.create({
        user_id: user.id,
        action: 'WITHDRAW',
        entity_type: 'Wallet',
        entity_id: wallet.id,
        details: `Withdrew ${amountNum} ${wallet.token_symbol} to ${mode === 'internal' ? 'internal wallet' : toAddress.slice(0, 10) + '...'}`,
        risk_level: risk.level,
      });

      // Deduct balance
      const newBalance = maxAmount - amountNum;
      const newUsd = newBalance * price;
      await ccs.entities.Wallet.update(wallet.id, {
        balance: newBalance,
        balance_usd: newUsd,
      });

      // If internal transfer, add to recipient
      if (mode === 'internal' && recipientWalletId) {
        const recipient = await ccs.entities.Wallet.get(recipientWalletId);
        if (recipient && recipient.token_symbol === wallet.token_symbol) {
          const rNewBal = (recipient.balance || 0) + amountNum;
          await ccs.entities.Wallet.update(recipientWalletId, {
            balance: rNewBal,
            balance_usd: rNewBal * TOKEN_PRICES[recipient.token_symbol],
          });
        }
      }

      setSuccess({ txHash, amount: amountNum, token: wallet.token_symbol });
      setTimeout(() => { onSuccess?.(); onClose(); }, 800);
    } catch (e) {
      setError(e.message || 'Transaction failed');
    }
    setSending(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: '#1E2329', border: '1px solid rgba(3,166,109,0.3)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(3,166,109,0.12)' }}>
            <Check className="w-8 h-8" style={{ color: '#03A66D' }} />
          </div>
          <h3 className="text-lg font-black mb-1" style={{ color: '#EAECEF' }}>Sent Successfully</h3>
          <p className="text-sm mb-4" style={{ color: '#848E9C' }}>
            {success.amount} {success.token} has been sent
          </p>
          <div className="rounded-lg p-3 text-xs font-mono break-all" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
            {success.txHash}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: `1px solid ${color}33` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" style={{ color }} />
            <h3 className="text-base font-bold" style={{ color: '#EAECEF' }}>Send / Withdraw</h3>
          </div>
          <button onClick={onClose} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
        </div>

        {/* Wallet info */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{wallet.label}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{wallet.balance?.toFixed(4)} {wallet.token_symbol}</div>
            <div className="text-xs" style={{ color: '#848E9C' }}>≈ ${(wallet.balance_usd || 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#0B0E11' }}>
            <button onClick={() => setMode('address')}
              className="flex-1 py-2 rounded-md text-xs font-bold transition-all"
              style={{ background: mode === 'address' ? '#1E2329' : 'transparent', color: mode === 'address' ? color : '#848E9C' }}>
              External Address
            </button>
            <button onClick={() => setMode('internal')}
              className="flex-1 py-2 rounded-md text-xs font-bold transition-all"
              style={{ background: mode === 'internal' ? '#1E2329' : 'transparent', color: mode === 'internal' ? color : '#848E9C' }}>
              Transfer Between Wallets
            </button>
          </div>

          {/* Address or wallet selector */}
          {mode === 'address' ? (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Destination Address</label>
              <input value={toAddress} onChange={e => setToAddress(e.target.value)}
                placeholder={wallet.chain === 'TRON' ? 'T...' : wallet.chain === 'SOL' ? 'Solana address...' : '0x...'}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Recipient Wallet (same token)</label>
              <SendWithdrawModalRecipientSelector wallet={wallet} recipientWalletId={recipientWalletId} setRecipientWalletId={setRecipientWalletId} />
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: '#848E9C' }}>Amount</label>
              <button onClick={() => setAmount(String(maxAmount))}
                className="text-xs font-bold transition-all hover:opacity-80" style={{ color: color }}>MAX</button>
            </div>
            <div className="relative">
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.0001"
                placeholder="0.0000"
                className="w-full px-3 py-3 rounded-lg text-lg font-black outline-none transition-all pr-20"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#848E9C' }}>{wallet.token_symbol}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span style={{ color: '#848E9C' }}>≈ ${usdValue.toFixed(2)}</span>
              <span style={{ color: '#4B5563' }}>Fee: ${(usdValue * 0.001).toFixed(4)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.2)' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#CF304A' }} />
              <span className="text-xs" style={{ color: '#CF304A' }}>{error}</span>
            </div>
          )}

          {/* Send button */}
          <button onClick={handleSend} disabled={sending || amountNum <= 0}
            className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
            {sending ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending...</span>
            ) : (
              `Send ${amountNum > 0 ? amountNum.toFixed(4) + ' ' + wallet.token_symbol : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline recipient selector that fetches same-token wallets
function SendWithdrawModalRecipientSelector({ wallet, recipientWalletId, setRecipientWalletId }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    const load = async () => {
      try {
        const user = await ccs.auth.me();
        const all = await ccs.entities.Wallet.filter({ user_id: user.id });
        setWallets(all?.filter(w => w.id !== wallet.id && w.token_symbol === wallet.token_symbol && w.is_active) || []);
      } catch (e) { /* ignore recipient wallet resolution failure */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-xs text-center py-3" style={{ color: '#848E9C' }}>Loading wallets...</div>;
  if (wallets.length === 0) return <div className="text-xs text-center py-3" style={{ color: '#848E9C' }}>No other {wallet.token_symbol} wallets available</div>;

  return (
    <SelectSheet
      value={recipientWalletId}
      onChange={setRecipientWalletId}
      title="Select Recipient Wallet"
      options={wallets.map(w => ({ value: w.id, label: `${w.label} — ${w.balance?.toFixed(2)} ${w.token_symbol}`, color: CHAIN_COLORS[w.chain] }))}
    />
  );
}
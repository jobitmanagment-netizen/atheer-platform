import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Building2, Plus, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, AlertCircle, Globe, BarChart3 } from 'lucide-react';
import FiatWalletCard from '@/components/banking/FiatWalletCard';
import DepositModal from '@/components/banking/DepositModal';
import WithdrawModal from '@/components/banking/WithdrawModal';
import PerformanceReport from '@/components/banking/PerformanceReport';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR'];
const TRANSFER_METHODS = [
  { id: 'SEPA', region: 'Europe', time: '1 day', fee: '$1 + 0.05%', color: '#627EEA' },
  { id: 'ACH', region: 'United States', time: '2 days', fee: '$3 + 0.05%', color: '#03A66D' },
  { id: 'GCC', region: 'Gulf Countries', time: '2 days', fee: '$5 + 0.08%', color: '#F0B90B' },
  { id: 'SWIFT', region: 'Global', time: '3-5 days', fee: '$25 + 0.1%', color: '#8247E5' },
  { id: 'WIRE', region: 'US Domestic', time: '2-3 days', fee: '$20 + 0.1%', color: '#03A66D' },
  { id: 'INSTANT', region: 'Global', time: 'Instant', fee: '1.5%', color: '#CF304A' },
];

const STATUS_STYLES = {
  pending: { color: '#F0B90B', icon: Clock, bg: 'rgba(240,185,11,0.12)' },
  processing: { color: '#627EEA', icon: Clock, bg: 'rgba(98,126,234,0.12)' },
  completed: { color: '#03A66D', icon: CheckCircle, bg: 'rgba(3,166,109,0.12)' },
  failed: { color: '#CF304A', icon: XCircle, bg: 'rgba(207,48,74,0.12)' },
  cancelled: { color: '#848E9C', icon: XCircle, bg: 'rgba(132,142,156,0.1)' },
  under_review: { color: '#F0B90B', icon: AlertCircle, bg: 'rgba(240,185,11,0.12)' },
};

export default function FiatBanking() {
  const { userProfile } = useOutletContext() || {};
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositData, setDepositData] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    try {
      const user = await ccs.auth.me();
      const [w, txs] = await Promise.all([
        ccs.entities.FiatWallet.filter({ user_id: user.id }),
        ccs.entities.BankTransaction.filter({ user_id: user.id }, '-created_date', 20),
      ]);
      setWallets(w || []);
      setTransactions(txs || []);
    } catch (e) { logger.error('FiatBanking', 'Failed to load fiat banking data', { error: e?.message || String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDeposit = async (currency) => {
    try {
      const res = await ccs.functions.invoke('bankTransfer', { action: 'deposit_instructions', currency });
      setDepositData({ currency, ...(res?.data || res) });
    } catch (e) { logger.error('FiatBanking', 'Failed to load deposit instructions', { currency, error: e?.message || String(e) }); }
  };

  const handleAddCurrency = async (currency) => {
    try {
      const user = await ccs.auth.me();
      const existing = wallets.find((w) => w.currency === currency);
      if (!existing) {
        const wallet = await ccs.entities.FiatWallet.create({
          user_id: user.id,
          currency,
          balance: 0,
          label: `${currency} Wallet`,
          is_active: true,
        });
        setWallets((current) => [wallet, ...current]);
      }
      await ccs.functions.invoke('bankTransfer', { action: 'deposit_instructions', currency });
      setShowAddCurrency(false);
      await load();
    } catch (e) { logger.error('FiatBanking', 'Failed to add fiat currency', { currency, error: e?.message || String(e) }); }
  };

  const totalBalanceUSD = wallets.reduce((s, w) => {
    const rates = { USD: 1, EUR: 1.08, GBP: 1.27, AED: 0.27, SAR: 0.27, AUD: 0.66, CAD: 0.73, CHF: 1.12 };
    return s + (w.balance || 0) * (rates[w.currency] || 1);
  }, 0);

  const kycVerified = userProfile?.kyc_status === 'verified';

  if (loading) return (
    <div className="p-5 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#1E2329' }} />)}
    </div>
  );

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5" style={{ color: '#F0B90B' }} />
        <div>
          <h1 className="text-xl font-black" style={{ color: '#EAECEF' }}>Global Banking</h1>
          <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>SWIFT · SEPA · ACH · GCC · Wire transfers</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(98,126,234,0.12)', color: '#627EEA', border: '1px solid rgba(98,126,234,0.2)' }}>
          <BarChart3 className="w-3.5 h-3.5" /> Performance
        </button>
        <span className="text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
              style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }}>
          <Globe className="w-3 h-3" /> GLOBAL
        </span>
      </div>
      </div>

      {/* KYC Warning */}
      {!kycVerified && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.2)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#CF304A' }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#CF304A' }}>KYC Verification Required</p>
            <p className="text-xs" style={{ color: '#848E9C' }}>Complete identity verification to enable banking operations.</p>
          </div>
          <Link to="/profile" className="px-4 py-2 rounded-xl text-xs font-bold text-black gold-gradient">Verify Now</Link>
        </div>
      )}

      {/* Total Balance */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1a1f26 0%, #0f1419 100%)', border: '1px solid #2B3139' }}>
        <div className="absolute right-0 top-0 w-72 h-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at right, rgba(240,185,11,0.06) 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <p className="text-sm font-medium mb-1" style={{ color: '#848E9C' }}>Total Fiat Balance (USD equivalent)</p>
          <p className="text-3xl font-black" style={{ color: '#EAECEF', fontFamily: 'Inter, monospace' }}>
            ${totalBalanceUSD.toFixed(2)}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs" style={{ color: '#848E9C' }}>{wallets.length} currencies</span>
            <span className="text-xs" style={{ color: '#4B5563' }}>·</span>
            <span className="text-xs" style={{ color: '#03A66D' }}>All transfers secured by AI risk engine</span>
          </div>
        </div>
      </div>

      {/* Fiat Wallets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Fiat Wallets</h3>
          <button onClick={() => setShowAddCurrency(!showAddCurrency)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(240,185,11,0.12)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
            <Plus className="w-3.5 h-3.5" /> Add Currency
          </button>
        </div>

        {showAddCurrency && (
          <div className="rounded-xl p-3 mb-3" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <p className="text-xs mb-2" style={{ color: '#848E9C' }}>Select currency to add wallet:</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CURRENCIES.filter(c => !wallets.find(w => w.currency === c)).map(c => (
                <button key={c} onClick={() => handleAddCurrency(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                        style={{ background: '#151A1F', color: '#EAECEF', border: '1px solid #2B3139' }}>
                  + {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wallets.length > 0 ? (
            wallets.map(w => (
              <FiatWalletCard key={w.id} wallet={w}
                              onDeposit={() => handleDeposit(w.currency)}
                              onWithdraw={() => setShowWithdraw(true)} />
            ))
          ) : (
            <div className="col-span-full rounded-2xl p-8 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#2B3139' }} />
              <p className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>No fiat wallets yet</p>
              <p className="text-xs mb-4" style={{ color: '#4B5563' }}>Add a currency wallet to start banking</p>
              <button onClick={() => setShowAddCurrency(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-black gold-gradient">
                + Add Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Methods */}
      <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4" style={{ color: '#627EEA' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Supported Transfer Methods</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TRANSFER_METHODS.map(m => (
            <div key={m.id} className="rounded-xl p-3 text-center" style={{ background: '#151A1F', border: `1px solid ${m.color}22` }}>
              <p className="text-sm font-black mb-1" style={{ color: m.color }}>{m.id}</p>
              <p className="text-[10px]" style={{ color: '#848E9C' }}>{m.region}</p>
              <p className="text-xs font-bold mt-1" style={{ color: '#EAECEF' }}>{m.time}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#4B5563' }}>{m.fee}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139' }}>
          <Clock className="w-4 h-4" style={{ color: '#F0B90B' }} />
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Bank Transaction History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="w-8 h-8 mb-2" style={{ color: '#2B3139' }} />
            <p className="text-sm" style={{ color: '#4B5563' }}>No bank transactions yet</p>
          </div>
        ) : (
          <div>
            <div className="grid px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ color: '#3B4149', borderBottom: '1px solid #1E2329', gridTemplateColumns: '1fr 80px 100px 100px 100px' }}>
              <span>Reference</span><span className="text-right">Type</span><span className="text-right">Amount</span><span className="text-right">Method</span><span className="text-right">Status</span>
            </div>
            {transactions.map(tx => {
              const style = STATUS_STYLES[tx.status] || STATUS_STYLES.pending;
              const StatusIcon = style.icon;
              return (
                <div key={tx.id} className="grid px-5 py-3 items-center text-xs hover:opacity-80"
                     style={{ gridTemplateColumns: '1fr 80px 100px 100px 100px', borderBottom: '1px solid #1A1F26' }}>
                  <div className="flex items-center gap-2">
                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-3 h-3" style={{ color: '#03A66D' }} /> : <ArrowUpRight className="w-3 h-3" style={{ color: '#CF304A' }} />}
                    <span className="font-mono font-bold" style={{ color: '#EAECEF' }}>{tx.reference_code?.slice(0, 16)}...</span>
                  </div>
                  <span className="text-right font-bold" style={{ color: tx.type === 'deposit' ? '#03A66D' : '#CF304A' }}>{tx.type}</span>
                  <span className="text-right font-bold" style={{ color: '#EAECEF' }}>{tx.amount?.toFixed(2)} {tx.currency}</span>
                  <span className="text-right" style={{ color: '#848E9C' }}>{tx.method}</span>
                  <div className="flex justify-end">
                    <span className="px-2 py-0.5 rounded font-bold flex items-center gap-1"
                          style={{ background: style.bg, color: style.color, fontSize: 10 }}>
                      <StatusIcon className="w-3 h-3" /> {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {depositData && <DepositModal currency={depositData.currency} data={depositData} onClose={() => setDepositData(null)} />}
      {showWithdraw && <WithdrawModal wallets={wallets} onClose={() => setShowWithdraw(false)} onSuccess={load} />}
      {showReport && <PerformanceReport onClose={() => setShowReport(false)} wallets={wallets} transactions={transactions} />}
    </div>
  );
}
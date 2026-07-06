import { useState } from 'react';
import { X, ArrowUpRight, Building2, AlertTriangle } from 'lucide-react';
import { ccs } from '@/api/ccsClient';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'AUD', 'CAD', 'CHF'];
const METHODS = [
  { id: 'SEPA', label: 'SEPA', desc: 'Europe · 1 day', fee: '$1 + 0.05%' },
  { id: 'ACH', label: 'ACH', desc: 'US · 2 days', fee: '$3 + 0.05%' },
  { id: 'GCC', label: 'GCC Transfer', desc: 'Gulf · 2 days', fee: '$5 + 0.08%' },
  { id: 'SWIFT', label: 'SWIFT', desc: 'Global · 3-5 days', fee: '$25 + 0.1%' },
  { id: 'WIRE', label: 'Wire', desc: 'US Domestic · 2-3 days', fee: '$20 + 0.1%' },
  { id: 'INSTANT', label: 'Instant', desc: 'Global · Instant', fee: '1.5%' },
];

export default function WithdrawModal({ wallets, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [currency, setCurrency] = useState(wallets[0]?.currency || 'USD');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('SWIFT');
  const [recipientName, setRecipientName] = useState('');
  const [recipientIban, setRecipientIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCountry, setBankCountry] = useState('');

  const selectedWallet = wallets.find(w => w.currency === currency);
  const maxBalance = selectedWallet?.balance || 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ccs.functions.invoke('bankTransfer', {
        action: 'withdraw',
        currency,
        amount: parseFloat(amount),
        method,
        recipient_iban: recipientIban,
        recipient_name: recipientName,
        swift_bic: swiftBic,
        bank_name: bankName,
        bank_country: bankCountry,
      });
      const data = res?.data || res;
      if (data.error) { setError(data.error); }
      else { setResult(data); setStep(3); }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Withdrawal failed');
    }
    setLoading(false);
  };

  const needsSwift = method === 'SWIFT' || method === 'WIRE' || method === 'GCC';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid #2B3139', background: '#1E2329' }}>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" style={{ color: '#CF304A' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Withdraw to Bank</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#848E9C' }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.2)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#CF304A' }} />
              <p className="text-xs" style={{ color: '#CF304A' }}>{error}</p>
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>Currency</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CURRENCIES.map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                            className="py-2 rounded-lg text-xs font-bold transition-all"
                            style={{ background: currency === c ? 'rgba(240,185,11,0.12)' : '#151A1F',
                                     color: currency === c ? '#F0B90B' : '#848E9C',
                                     border: currency === c ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold" style={{ color: '#848E9C' }}>Amount</label>
                  <button onClick={() => setAmount(String(maxBalance))} className="text-xs font-bold" style={{ color: '#F0B90B' }}>Max: {maxBalance.toFixed(2)} {currency}</button>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                       className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none"
                       style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>Transfer Method</label>
                <div className="space-y-1.5">
                  {METHODS.map(m => (
                    <button key={m.id} onClick={() => setMethod(m.id)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all"
                            style={{ background: method === m.id ? 'rgba(240,185,11,0.08)' : '#151A1F',
                                     border: method === m.id ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139' }}>
                      <div className="text-left">
                        <p className="text-xs font-bold" style={{ color: method === m.id ? '#F0B90B' : '#EAECEF' }}>{m.label}</p>
                        <p className="text-[10px]" style={{ color: '#848E9C' }}>{m.desc}</p>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#848E9C' }}>{m.fee}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!amount || parseFloat(amount) <= 0}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-black gold-gradient disabled:opacity-30">
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" style={{ color: '#F0B90B' }} />
                <h4 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Bank Details</h4>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>Recipient Name</label>
                <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="John Doe"
                       className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                       style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>IBAN / Account Number</label>
                <input value={recipientIban} onChange={e => setRecipientIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00"
                       className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none"
                       style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
              </div>

              {needsSwift && (
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>SWIFT / BIC Code</label>
                  <input value={swiftBic} onChange={e => setSwiftBic(e.target.value.toUpperCase())} placeholder="DEUTDEFF"
                         className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none"
                         style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>Bank Name</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Deutsche Bank"
                         className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                         style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: '#848E9C' }}>Country</label>
                  <input value={bankCountry} onChange={e => setBankCountry(e.target.value)} placeholder="Germany"
                         className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                         style={{ background: '#151A1F', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: '#151A1F', color: '#848E9C', border: '1px solid #2B3139' }}>Back</button>
                <button onClick={handleSubmit} disabled={loading || !recipientName || !recipientIban || (needsSwift && !swiftBic)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black gold-gradient disabled:opacity-30">
                  {loading ? 'Processing...' : 'Submit Withdrawal'}
                </button>
              </div>
            </>
          )}

          {step === 3 && result && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                   style={{ background: result.transaction.risk_level === 'CRITICAL' || result.transaction.risk_level === 'HIGH'
                     ? 'rgba(207,48,74,0.12)' : 'rgba(3,166,109,0.12)' }}>
                <Building2 className="w-8 h-8" style={{ color: result.transaction.risk_level === 'CRITICAL' || result.transaction.risk_level === 'HIGH' ? '#CF304A' : '#03A66D' }} />
              </div>
              <h3 className="text-base font-black mb-1" style={{ color: '#EAECEF' }}>
                {result.transaction.status === 'under_review' ? 'Under Review' : 'Withdrawal Initiated'}
              </h3>
              <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
                {result.transaction.status === 'under_review'
                  ? 'Your transaction is under compliance review. You will be notified once approved.'
                  : `Estimated arrival: ${new Date(result.transaction.estimated_arrival).toLocaleDateString()}`}
              </p>

              <div className="space-y-2 text-left">
                <div className="flex justify-between text-xs p-2 rounded-lg" style={{ background: '#151A1F' }}>
                  <span style={{ color: '#848E9C' }}>Reference</span>
                  <span className="font-mono font-bold" style={{ color: '#F0B90B' }}>{result.transaction.reference_code}</span>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg" style={{ background: '#151A1F' }}>
                  <span style={{ color: '#848E9C' }}>Amount</span>
                  <span className="font-bold" style={{ color: '#EAECEF' }}>{result.transaction.amount} {result.transaction.currency}</span>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg" style={{ background: '#151A1F' }}>
                  <span style={{ color: '#848E9C' }}>Fee</span>
                  <span className="font-bold" style={{ color: '#EAECEF' }}>${result.transaction.fee_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg" style={{ background: '#151A1F' }}>
                  <span style={{ color: '#848E9C' }}>Method</span>
                  <span className="font-bold" style={{ color: '#EAECEF' }}>{result.transaction.method}</span>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg" style={{ background: '#151A1F' }}>
                  <span style={{ color: '#848E9C' }}>Risk Level</span>
                  <span className="font-bold" style={{ color: result.transaction.risk_level === 'HIGH' || result.transaction.risk_level === 'CRITICAL' ? '#CF304A' : '#03A66D' }}>{result.transaction.risk_level}</span>
                </div>
              </div>

              <button onClick={() => { onSuccess(); onClose(); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-black gold-gradient mt-4">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
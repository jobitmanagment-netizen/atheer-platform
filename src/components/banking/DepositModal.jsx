import { useState, useEffect } from 'react';
import { X, Copy, Check, Building2, FileText, QrCode, Clock, Zap } from 'lucide-react';

export default function DepositModal({ currency, data, onClose }) {
  const [copied, setCopied] = useState(null);
  const [countdown, setCountdown] = useState(300);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(p => p > 0 ? p - 1 : 300), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const details = [
    { label: 'Beneficiary Name', value: data.beneficiary_name },
    { label: 'Bank Name', value: data.bank_name },
    { label: 'IBAN / Account', value: data.virtual_iban, copyable: true },
    { label: 'SWIFT / BIC', value: data.swift_bic, copyable: true },
    { label: 'Bank Country', value: data.bank_country },
    { label: 'Reference Code', value: data.reference_code, copyable: true, highlight: true },
  ];

  const estTime = data.method === 'INSTANT' ? 'Instant' : data.method === 'SEPA' ? '1-2 days' : '3-5 days';
  const fee = data.method === 'INSTANT' ? '1.5%' : data.method === 'SEPA' ? '$1 + 0.05%' : '$25 + 0.1%';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Deposit {currency}</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#848E9C' }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Smart Header */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(240,185,11,0.08), rgba(98,126,234,0.08))', border: '1px solid rgba(240,185,11,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: '#F0B90B' }} />
                <p className="text-xs font-bold" style={{ color: '#F0B90B' }}>Smart Deposit</p>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#848E9C' }}>
                <Clock className="w-3 h-3" />
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <p className="text-xs" style={{ color: '#848E9C' }}>Send {currency} to the details below. Est. time: <span className="font-bold" style={{ color: '#03A66D' }}>{estTime}</span> · Fee: <span className="font-bold" style={{ color: '#F0B90B' }}>{fee}</span></p>
          </div>

          {/* QR Code Option */}
          {data.qr_code_url && (
            <div className="rounded-xl p-4 text-center" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <button onClick={() => setShowQR(!showQR)} className="flex items-center justify-center gap-2 w-full mb-2">
                <QrCode className="w-4 h-4" style={{ color: '#627EEA' }} />
                <span className="text-xs font-bold" style={{ color: '#627EEA' }}>{showQR ? 'Hide' : 'Show'} QR Code</span>
              </button>
              {showQR && (
                <div className="mt-3 p-3 rounded-xl bg-white inline-block">
                  <img src={data.qr_code_url} alt="Deposit QR" className="w-40 h-40" />
                </div>
              )}
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-2.5">
            {details.map(d => (
              <div key={d.label} className="flex items-center justify-between p-3 rounded-xl"
                   style={{ background: d.highlight ? 'rgba(240,185,11,0.08)' : '#151A1F', border: d.highlight ? '1px solid rgba(240,185,11,0.2)' : '1px solid #2B3139' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: '#848E9C' }}>{d.label}</p>
                  <p className="text-sm font-bold font-mono mt-0.5" style={{ color: d.highlight ? '#F0B90B' : '#EAECEF', wordBreak: 'break-all' }}>{d.value}</p>
                </div>
                {d.copyable && (
                  <button onClick={() => handleCopy(d.value, d.label)}
                          className="flex-shrink-0 ml-2 p-2 rounded-lg transition-all hover:opacity-80"
                          style={{ background: '#2B3139' }}>
                    {copied === d.label ? <Check className="w-3.5 h-3.5" style={{ color: '#03A66D' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* WhatsApp Alerts */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <p className="text-xs font-bold" style={{ color: '#25D366' }}>WhatsApp Alerts</p>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-green-500" />
                <span style={{ color: '#848E9C' }}>Enable</span>
              </label>
            </div>
            <p className="text-xs" style={{ color: '#848E9C' }}>Get instant notifications when your deposit is received and processed</p>
          </div>

          {/* Important Notes */}
          <div className="rounded-xl p-3" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
              <p className="text-xs font-bold" style={{ color: '#848E9C' }}>Important Notes</p>
            </div>
            <ul className="space-y-1">
              {data.instructions?.map((inst, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#848E9C' }}>
                  <span style={{ color: '#F0B90B' }}>•</span> {inst}
                </li>
              ))}
            </ul>
          </div>

          <button onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-black gold-gradient">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
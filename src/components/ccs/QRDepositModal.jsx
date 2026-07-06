import { useState } from 'react';
import { X, Copy, Check, QrCode, AlertTriangle, ExternalLink } from 'lucide-react';
import { CHAIN_COLORS, CHAIN_LABELS, CHAIN_EXPLORERS } from '@/lib/ccs-constants';

export default function QRDepositModal({ wallet, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showNetSelector, setShowNetSelector] = useState(false);

  if (!wallet) return null;

  const color = CHAIN_COLORS[wallet.chain] || '#F0B90B';
  const label = CHAIN_LABELS[wallet.chain] || wallet.chain;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=1E2329&color=EAECEF&margin=8&data=${encodeURIComponent(wallet.address)}`;
  const explorerUrl = CHAIN_EXPLORERS[wallet.chain]?.(wallet.address);

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom" style={{ background: 'rgba(0,0,0,0.88)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: `1px solid ${color}33` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color }} />
            <h3 className="text-base font-bold" style={{ color: '#EAECEF' }}>Deposit</h3>
          </div>
          <button onClick={onClose} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
        </div>

        {/* Network badge */}
        <div className="px-5 pt-4">
          <div
            className="w-full px-4 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all"
            style={{ background: `${color}10`, border: `1px solid ${color}33` }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{label}</span>
            </div>
            <span className="text-xs font-mono" style={{ color: color }}>{wallet.token_symbol}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center py-6 px-5">
          <div className="relative rounded-2xl p-4" style={{ background: '#1E2329', border: `2px solid ${color}33` }}>
            <img src={qrUrl} alt="Deposit QR Code" className="w-48 h-48 rounded-lg" />
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: color }}>
              <span className="text-xs font-black text-black">{wallet.token_symbol?.[0] || 'T'}</span>
            </div>
          </div>
          <p className="text-sm font-semibold mt-4" style={{ color: '#EAECEF' }}>Scan to deposit {wallet.token_symbol}</p>
          <p className="text-xs mt-1" style={{ color: '#848E9C' }}>Send only {wallet.token_symbol} on the {label} network</p>
        </div>

        {/* Address */}
        <div className="px-5 pb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Wallet Address</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono break-all" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF', maxHeight: 60, overflow: 'hidden' }}>
              {wallet.address}
            </div>
            <button onClick={handleCopy}
              className="flex-shrink-0 p-2.5 rounded-lg transition-all"
              style={{ background: copied ? 'rgba(3,166,109,0.15)' : `${color}15`, color: copied ? '#03A66D' : color, border: `1px solid ${copied ? '#03A66D33' : color + '33'}` }}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Warning */}
        {wallet.chain === 'TRON' && (
          <div className="mx-5 mb-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,0,19,0.08)', border: '1px solid rgba(255,0,19,0.2)' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FF0013' }} />
            <p className="text-xs" style={{ color: '#FF4444' }}>
              Only send USDT TRC20 to this address. Sending other tokens may result in permanent loss.
            </p>
          </div>
        )}

        {/* Explorer link */}
        {explorerUrl && (
          <div className="px-5 pb-5">
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
              <ExternalLink className="w-3.5 h-3.5" />
              View on Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
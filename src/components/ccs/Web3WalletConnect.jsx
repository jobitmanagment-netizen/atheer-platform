import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { Wallet, CheckCircle2, Loader2, ExternalLink, Copy, Check, Zap, AlertCircle, Power } from 'lucide-react';

function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Chain ID mapping
const CHAIN_MAP = {
  '0x1': { name: 'Ethereum', symbol: 'ETH', chain: 'ETH', explorer: 'https://etherscan.io/address/' },
  '0x38': { name: 'BNB Chain', symbol: 'BNB', chain: 'BNB', explorer: 'https://bscscan.com/address/' },
  '0x89': { name: 'Polygon', symbol: 'MATIC', chain: 'POLY', explorer: 'https://polygonscan.com/address/' },
  '0xaa36a7': { name: 'Sepolia', symbol: 'ETH', chain: 'ETH', explorer: 'https://sepolia.etherscan.io/address/' },
};

export default function Web3WalletConnect({ userProfile, onConnected }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [savedWallet, setSavedWallet] = useState(null);

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      setHasMetaMask(true);
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          window.ethereum.request({ method: 'eth_chainId' }).then(setChainId);
        }
      }).catch((error) => {
        logger.warn('Web3WalletConnect', 'MetaMask account lookup failed', { error: error?.message || String(error) });
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setSavedWallet(null);
        } else {
          setAccount(accounts[0]);
        }
      });
      window.ethereum.on('chainChanged', (cid) => {
        setChainId(cid);
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!hasMetaMask) {
      setError('MetaMask not detected. Install it from metamask.io');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];
      setAccount(addr);
      const cid = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(cid);

      // Save to Wallet entity
      const user = await ccs.auth.me();
      const chainInfo = CHAIN_MAP[cid] || { name: 'Unknown', symbol: 'ETH', chain: 'ETH', explorer: '#' };
      const wallet = await ccs.entities.Wallet.create({
        user_id: user.id,
        label: `MetaMask (${chainInfo.name})`,
        address: addr,
        chain: chainInfo.chain,
        token_symbol: chainInfo.symbol,
        balance: 0,
        balance_usd: 0,
        is_active: true,
      });
      await ccs.entities.AuditLog.create({
        user_id: user.id,
        action: 'CONNECT_WEB3_WALLET',
        entity_type: 'Wallet',
        entity_id: wallet.id,
        details: `Connected MetaMask wallet ${shortenAddress(addr)} on ${chainInfo.name}`,
        risk_level: 'LOW',
      });
      setSavedWallet(wallet);
      if (onConnected) onConnected(wallet);
    } catch (e) {
      if (e.code === 4001) setError('Connection rejected');
      else setError(e.message || 'Failed to connect');
    }
    setConnecting(false);
  };

  const disconnect = () => {
    setAccount(null);
    setSavedWallet(null);
    setChainId(null);
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const chainInfo = chainId ? CHAIN_MAP[chainId] : null;

  // Not installed
  if (!hasMetaMask) {
    return (
      <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
            <Wallet className="w-4 h-4" style={{ color: '#F0B90B' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Connect Web3 Wallet</h3>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: 'rgba(240,185,11,0.06)', border: '1px solid rgba(240,185,11,0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F0B90B' }} />
          <p className="text-xs" style={{ color: '#848E9C' }}>
            MetaMask browser extension not detected. Install it to connect your Web3 wallet.
          </p>
        </div>
        <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.3)' }}>
          <ExternalLink className="w-4 h-4" />
          Download MetaMask
        </a>
      </div>
    );
  }

  // Connected
  if (account) {
    return (
      <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid rgba(3,166,109,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(3,166,109,0.12)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: '#03A66D' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Web3 Wallet Connected</h3>
              <p className="text-xs" style={{ color: '#03A66D' }}>✓ {chainInfo?.name || 'Unknown chain'}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F6851B' }}>
            <span className="text-xs font-black text-white">🦊</span>
          </div>
        </div>

        <div className="rounded-lg p-3 mb-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs mb-0.5" style={{ color: '#848E9C' }}>Wallet Address</div>
              <div className="text-sm font-mono font-bold" style={{ color: '#EAECEF' }}>{shortenAddress(account)}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={copyAddress} className="p-2 rounded-lg transition-all hover:opacity-80" style={{ background: '#1E2329' }}>
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#03A66D' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />}
              </button>
              {chainInfo && (
                <a href={`${chainInfo.explorer}${account}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-all hover:opacity-80" style={{ background: '#1E2329' }}>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
                </a>
              )}
            </div>
          </div>
        </div>

        <button onClick={disconnect}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A', border: '1px solid rgba(207,48,74,0.2)' }}>
          <Power className="w-4 h-4" />
          Disconnect Wallet
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <div className="rounded-xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
          <Wallet className="w-4 h-4" style={{ color: '#F0B90B' }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Connect Web3 Wallet</h3>
          <p className="text-xs" style={{ color: '#848E9C' }}>MetaMask detected</p>
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
        Connect your MetaMask wallet to interact with DeFi protocols, sign transactions, and manage on-chain assets directly.
      </p>
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-xs" style={{ background: 'rgba(207,48,74,0.06)', color: '#CF304A' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <button onClick={connectWallet} disabled={connecting}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-black text-black transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #F6851B, #F0B90B)' }}>
        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {connecting ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    </div>
  );
}
export const TOKEN_PRICES = {
  ETH: 3245,
  BNB: 612,
  MATIC: 0.89,
  USDT: 1.0,
  TRX: 0.12,
  'USDT-TRC20': 1.0,
  SOL: 185.4,
  XRP: 2.31,
  ADA: 0.92,
  DOGE: 0.38,
  AVAX: 41.2,
  LINK: 22.5,
};

export const TOKEN_CHANGE_24H = {
  ETH: +2.34,
  BNB: -0.87,
  MATIC: +5.12,
  USDT: 0.0,
  TRX: +8.45,
  'USDT-TRC20': 0.0,
  SOL: +3.21,
  XRP: +0.54,
  ADA: -1.23,
  DOGE: +6.78,
  AVAX: +1.45,
  LINK: -2.10,
};

export const CHAIN_COLORS = {
  ETH:  '#627EEA',
  BNB:  '#F0B90B',
  POLY: '#8247E5',
  TRON: '#FF0013',
  SOL:  '#14F195',
  XRP:  '#23292F',
  ADA:  '#0033AD',
  DOGE: '#BA2F1B',
  AVAX: '#E84142',
};

export const CHAIN_LABELS = {
  ETH:  'Ethereum',
  BNB:  'BNB Chain',
  POLY: 'Polygon',
  TRON: 'Tron TRC20',
  SOL:  'Solana',
  XRP:  'Ripple',
  ADA:  'Cardano',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
};

export const RISK_COLORS = {
  SAFE:     { bg: 'rgba(3,166,109,0.15)',  text: '#03A66D', border: '#03A66D' },
  LOW:      { bg: 'rgba(24,144,255,0.15)', text: '#1890FF', border: '#1890FF' },
  MEDIUM:   { bg: 'rgba(240,185,11,0.15)', text: '#F0B90B', border: '#F0B90B' },
  HIGH:     { bg: 'rgba(255,122,0,0.15)',  text: '#FF7A00', border: '#FF7A00' },
  CRITICAL: { bg: 'rgba(207,48,74,0.15)',  text: '#CF304A', border: '#CF304A' },
};

// USDT-TRC20 full details
export const TRC20_INFO = {
  symbol:   'USDT-TRC20',
  network:  'TRON',
  contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  decimals: 6,
  color:    '#FF0013',
  minFee:   1.0,
  speed:    '~3s block time',
  explorer: 'https://tronscan.org',
};

export const POOLS = [
  { id: 'eth-usdt',     name: 'ETH/USDT',          tokenA: 'ETH',        tokenB: 'USDT',      chain: 'ETH',  apy: 12.4, tvl: 45000000, providers: 1247, change24h:  2.1, isTRC20: false },
  { id: 'bnb-usdt',     name: 'BNB/USDT',           tokenA: 'BNB',        tokenB: 'USDT',      chain: 'BNB',  apy: 18.7, tvl: 28000000, providers:  892, change24h: -0.8, isTRC20: false },
  { id: 'trc20-trx',   name: 'USDT-TRC20/TRX',     tokenA: 'USDT-TRC20', tokenB: 'TRX',       chain: 'TRON', apy: 24.1, tvl: 12000000, providers:  634, change24h:  5.3, isTRC20: true  },
  { id: 'trc20-usdt',  name: 'USDT-TRC20/USDT',    tokenA: 'USDT-TRC20', tokenB: 'USDT',      chain: 'TRON', apy: 19.5, tvl:  9500000, providers:  512, change24h:  0.1, isTRC20: true  },
  { id: 'matic-usdt',  name: 'MATIC/USDT',          tokenA: 'MATIC',      tokenB: 'USDT',      chain: 'POLY', apy: 15.2, tvl:  8000000, providers:  421, change24h:  1.7, isTRC20: false },
  { id: 'sol-usdt',    name: 'SOL/USDT',           tokenA: 'SOL',         tokenB: 'USDT',      chain: 'SOL',  apy: 16.8, tvl: 22000000, providers:  780, change24h:  3.2, isTRC20: false },
  { id: 'avax-usdt',   name: 'AVAX/USDT',          tokenA: 'AVAX',        tokenB: 'USDT',      chain: 'AVAX', apy: 14.5, tvl:  6500000, providers:  312, change24h:  1.4, isTRC20: false },
  { id: 'doge-usdt',   name: 'DOGE/USDT',          tokenA: 'DOGE',        tokenB: 'USDT',      chain: 'DOGE', apy: 9.8,  tvl:  4200000, providers:  198, change24h:  6.7, isTRC20: false },
];

export const TOKENS = ['ETH', 'BNB', 'MATIC', 'USDT', 'TRX', 'USDT-TRC20', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK'];

export const TOKEN_CHAINS = {
  ETH:          'ETH',
  BNB:          'BNB',
  MATIC:        'POLY',
  USDT:         'ETH',
  TRX:          'TRON',
  'USDT-TRC20': 'TRON',
  SOL:          'SOL',
  XRP:          'XRP',
  ADA:          'ADA',
  DOGE:         'DOGE',
  AVAX:         'AVAX',
  LINK:         'ETH',
};

// Token display metadata
export const TOKEN_META = {
  ETH:          { color: '#627EEA', bg: '#627EEA18', label: 'Ethereum',     chain: 'ETH'  },
  BNB:          { color: '#F0B90B', bg: '#F0B90B18', label: 'BNB',          chain: 'BNB'  },
  MATIC:        { color: '#8247E5', bg: '#8247E518', label: 'Polygon',       chain: 'POLY' },
  USDT:         { color: '#26A17B', bg: '#26A17B18', label: 'Tether ERC20',  chain: 'ETH'  },
  TRX:          { color: '#FF0013', bg: '#FF001318', label: 'TRON',          chain: 'TRON' },
  'USDT-TRC20': { color: '#FF0013', bg: '#FF001318', label: 'USDT TRC20',    chain: 'TRON', isTRC20: true },
  SOL:          { color: '#14F195', bg: '#14F19518', label: 'Solana',        chain: 'SOL'  },
  XRP:          { color: '#23292F', bg: '#23292F18', label: 'Ripple',        chain: 'XRP'  },
  ADA:          { color: '#0033AD', bg: '#0033AD18', label: 'Cardano',       chain: 'ADA'  },
  DOGE:         { color: '#BA2F1B', bg: '#BA2F1B18', label: 'Dogecoin',      chain: 'DOGE' },
  AVAX:         { color: '#E84142', bg: '#E8414218', label: 'Avalanche',     chain: 'AVAX' },
  LINK:         { color: '#2A5ADA', bg: '#2A5ADA18', label: 'Chainlink',     chain: 'ETH'  },
};

export const PLATFORM_STATS = {
  tvl:       93000000,
  volume24h: 2400000000,
  users:     47000,
  chains:    9,
};

// Network options for wallet creation
export const NETWORK_OPTIONS = [
  { value: 'ETH',   label: 'Ethereum (ETH)',       color: '#627EEA' },
  { value: 'BNB',   label: 'BNB Chain',             color: '#F0B90B' },
  { value: 'POLY',  label: 'Polygon (MATIC)',       color: '#8247E5' },
  { value: 'TRON',  label: 'Tron (TRX / USDT-TRC20)', color: '#FF0013' },
  { value: 'SOL',   label: 'Solana (SOL)',          color: '#14F195' },
  { value: 'XRP',   label: 'Ripple (XRP)',          color: '#23292F' },
  { value: 'ADA',   label: 'Cardano (ADA)',         color: '#0033AD' },
  { value: 'DOGE',  label: 'Dogecoin (DOGE)',       color: '#BA2F1B' },
  { value: 'AVAX',  label: 'Avalanche (AVAX)',      color: '#E84142' },
];

export const CHAIN_TOKENS = {
  ETH: ['ETH', 'USDT', 'LINK'],
  BNB: ['BNB', 'USDT'],
  POLY: ['MATIC', 'USDT'],
  TRON: ['TRX', 'USDT-TRC20'],
  SOL: ['SOL', 'USDT'],
  XRP: ['XRP'],
  ADA: ['ADA'],
  DOGE: ['DOGE'],
  AVAX: ['AVAX', 'USDT'],
};

// Explorer URLs for each chain
export const CHAIN_EXPLORERS = {
  ETH:  (addr) => `https://etherscan.io/address/${addr}`,
  BNB:  (addr) => `https://bscscan.com/address/${addr}`,
  POLY: (addr) => `https://polygonscan.com/address/${addr}`,
  TRON: (addr) => `https://tronscan.org/#/address/${addr}`,
  SOL:  (addr) => `https://solscan.io/account/${addr}`,
  XRP:  (addr) => `https://livenet.xrpl.org/accounts/${addr}`,
  ADA:  (addr) => `https://cardanoscan.io/address/${addr}`,
  DOGE: (addr) => `https://dogechain.info/address/${addr}`,
  AVAX: (addr) => `https://snowtrace.io/address/${addr}`,
};
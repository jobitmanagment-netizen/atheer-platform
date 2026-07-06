const DEFAULT_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8080';
const TOKEN_KEY = 'atheer_access_token';
const REFRESH_TOKEN_KEY = 'atheer_refresh_token';

function getBaseUrl() {
  return DEFAULT_BASE_URL;
}

function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setStoredToken(token) {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch {}
}

function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}

function setRefreshToken(token) {
  try { if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token); else localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {}
}

let isRefreshing = false;
let refreshQueue = [];

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    setStoredToken(null);
    setRefreshToken(null);
    throw new Error('Session expired');
  }

  const data = await response.json();
  setStoredToken(data.accessToken);
  return data.accessToken;
}

async function request(path, { method = 'GET', body, token, timeoutMs = 30000, retry = true } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    const accessToken = token || getStoredToken();
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401 && retry && getRefreshToken()) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          refreshQueue.forEach(cb => cb(newToken));
          refreshQueue = [];
          return request(path, { method, body, timeoutMs, retry: false });
        } catch {
          isRefreshing = false;
          refreshQueue = [];
          throw new Error('Session expired');
        }
      } else {
        return new Promise((resolve, reject) => {
          refreshQueue.push(async (newToken) => {
            try {
              const result = await request(path, { method, body, token: newToken, timeoutMs, retry: false });
              resolve(result);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    }

    if (response.status === 429) {
      const err = new Error('Too many requests. Please slow down.');
      err.status = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(payload?.error || `Request failed: ${response.status}`);
      err.status = response.status;
      err.code = payload?.code || 'REQUEST_FAILED';
      throw err;
    }

    return payload;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out');
      timeoutErr.status = 408;
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const platformClient = {
  auth: {
    async register({ email, password, fullName }) {
      const payload = await request('/api/auth/register', {
        method: 'POST',
        body: { email, password, fullName },
        retry: false,
      });
      if (payload?.accessToken) setStoredToken(payload.accessToken);
      if (payload?.refreshToken) setRefreshToken(payload.refreshToken);
      return payload;
    },

    async login({ email, password }) {
      const payload = await request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        retry: false,
      });
      if (payload?.accessToken) setStoredToken(payload.accessToken);
      if (payload?.refreshToken) setRefreshToken(payload.refreshToken);
      return payload;
    },

    async me() {
      return request('/api/auth/me');
    },

    async updateProfile(data) {
      return request('/api/auth/profile', { method: 'PUT', body: data });
    },

    async logout() {
      try { await request('/api/auth/logout', { method: 'POST' }); } catch {}
      setStoredToken(null);
      setRefreshToken(null);
    },

    getToken() { return getStoredToken(); },
    getRefreshToken() { return getRefreshToken(); },
    isAuthenticated() { return !!getStoredToken(); },
  },

  markets: {
    async list() {
      const { markets } = await request('/api/markets');
      return markets;
    },

    async get(symbol) {
      const { market } = await request(`/api/markets/${symbol}`);
      return market;
    },

    async orderBook(symbol) {
      return request(`/api/markets/${symbol}/orderbook`);
    },

    async candles(symbol, timeframe = '1h', limit = 100) {
      return request(`/api/markets/${symbol}/candles?timeframe=${timeframe}&limit=${limit}`);
    },

    async ticker() {
      const { tickers } = await request('/api/ticker');
      return tickers;
    },
  },

  orders: {
    async create(data) {
      const { order } = await request('/api/orders', { method: 'POST', body: data });
      return order;
    },

    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      const { orders } = await request(`/api/orders?${query}`);
      return orders;
    },

    async get(id) {
      const { order } = await request(`/api/orders/${id}`);
      return order;
    },

    async cancel(id) {
      const { order } = await request(`/api/orders/${id}`, { method: 'DELETE' });
      return order;
    },
  },

  trades: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      const { trades } = await request(`/api/trades?${query}`);
      return trades;
    },
  },

  wallets: {
    async list() {
      const { wallets } = await request('/api/wallets');
      return wallets;
    },

    async bootstrap(currencies) {
      const { wallets } = await request('/api/wallets/bootstrap', {
        method: 'POST',
        body: { currencies },
      });
      return wallets;
    },

    async deposit(currency, amount, chain) {
      const { wallet } = await request('/api/wallets/deposit', {
        method: 'POST',
        body: { currency, amount, chain },
      });
      return wallet;
    },

    async fiatList() {
      const { wallets } = await request('/api/fiat-wallets');
      return wallets;
    },

    async fiatCreate(currency, label) {
      const { wallet } = await request('/api/fiat-wallets', {
        method: 'POST',
        body: { currency, label },
      });
      return wallet;
    },
  },

  banking: {
    async transactions(params = {}) {
      const query = new URLSearchParams(params).toString();
      const { transactions } = await request(`/api/banking/transactions?${query}`);
      return transactions;
    },

    async deposit(data) {
      const { transaction } = await request('/api/banking/deposit', { method: 'POST', body: data });
      return transaction;
    },

    async withdraw(data) {
      const { transaction } = await request('/api/banking/withdraw', { method: 'POST', body: data });
      return transaction;
    },

    async transfer(data) {
      return request('/api/banking/transfer', { method: 'POST', body: data });
    },

    async methods() {
      const { methods } = await request('/api/banking/methods');
      return methods;
    },

    async performance() {
      return request('/api/banking/performance');
    },
  },

  kyc: {
    async submit(data) {
      const { submission } = await request('/api/kyc/submit', { method: 'POST', body: data });
      return submission;
    },

    async status() {
      return request('/api/kyc/status');
    },

    async uploadDocument(id, documentType, url) {
      return request(`/api/kyc/${id}/upload`, { method: 'POST', body: { documentType, url } });
    },
  },

  futures: {
    async positions() {
      const { positions } = await request('/api/futures/positions');
      return positions;
    },

    async open(data) {
      const { position } = await request('/api/futures/positions', { method: 'POST', body: data });
      return position;
    },

    async close(id) {
      const { position } = await request(`/api/futures/positions/${id}/close`, { method: 'PUT' });
      return position;
    },

    async get(id) {
      const { position } = await request(`/api/futures/positions/${id}`);
      return position;
    },

    async setLeverage(leverage) {
      return request('/api/futures/leverage', { method: 'POST', body: { leverage } });
    },
  },

  bots: {
    async list() {
      const { bots } = await request('/api/bots');
      return bots;
    },

    async create(data) {
      const { bot } = await request('/api/bots', { method: 'POST', body: data });
      return bot;
    },

    async update(id, data) {
      const { bot } = await request(`/api/bots/${id}`, { method: 'PUT', body: data });
      return bot;
    },

    async start(id) {
      const { bot } = await request(`/api/bots/${id}/start`, { method: 'POST' });
      return bot;
    },

    async stop(id) {
      const { bot } = await request(`/api/bots/${id}/stop`, { method: 'POST' });
      return bot;
    },

    async delete(id) {
      return request(`/api/bots/${id}`, { method: 'DELETE' });
    },
  },

  copyTrading: {
    async traders(params = {}) {
      const query = new URLSearchParams(params).toString();
      const { traders } = await request(`/api/copy-trading/traders?${query}`);
      return traders;
    },

    async getTrader(id) {
      const { trader } = await request(`/api/copy-trading/traders/${id}`);
      return trader;
    },

    async myCopies() {
      const { copies } = await request('/api/copy-trading/my-copies');
      return copies;
    },

    async startCopy(data) {
      const { copyTrade } = await request('/api/copy-trading/copy', { method: 'POST', body: data });
      return copyTrade;
    },

    async stopCopy(id) {
      const { copyTrade } = await request(`/api/copy-trading/copy/${id}/stop`, { method: 'PUT' });
      return copyTrade;
    },
  },

  earn: {
    async products() {
      return request('/api/earn/products');
    },

    async stake(data) {
      const { position } = await request('/api/earn/stake', { method: 'POST', body: data });
      return position;
    },

    async positions() {
      return request('/api/earn/positions');
    },

    async addLiquidity(data) {
      const { session } = await request('/api/earn/liquidity', { method: 'POST', body: data });
      return session;
    },

    async withdrawLiquidity(id) {
      const { session } = await request(`/api/earn/liquidity/${id}/withdraw`, { method: 'POST' });
      return session;
    },
  },

  priceAlerts: {
    async list() {
      const { alerts } = await request('/api/price-alerts');
      return alerts;
    },

    async create(data) {
      const { alert } = await request('/api/price-alerts', { method: 'POST', body: data });
      return alert;
    },

    async toggle(id) {
      const { alert } = await request(`/api/price-alerts/${id}/toggle`, { method: 'PUT' });
      return alert;
    },

    async delete(id) {
      return request(`/api/price-alerts/${id}`, { method: 'DELETE' });
    },
  },

  rewards: {
    async get() {
      return request('/api/rewards');
    },
  },

  notifications: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/api/notifications?${query}`);
    },

    async markRead(id) {
      const { notification } = await request(`/api/notifications/${id}/read`, { method: 'PUT' });
      return notification;
    },

    async markAllRead() {
      return request('/api/notifications/read-all', { method: 'PUT' });
    },
  },

  admin: {
    async stats() {
      return request('/api/admin/stats');
    },

    async users() {
      const { users } = await request('/api/admin/users');
      return users;
    },

    async updateUser(id, data) {
      const { user } = await request(`/api/admin/users/${id}`, { method: 'PUT', body: data });
      return user;
    },

    async threats() {
      const { threats } = await request('/api/admin/threats');
      return threats;
    },

    async resolveThreat(id) {
      const { threat } = await request(`/api/admin/threats/${id}/resolve`, { method: 'PUT' });
      return threat;
    },

    async auditLogs(params = {}) {
      const query = new URLSearchParams(params).toString();
      const { auditLogs } = await request(`/api/admin/audit-logs?${query}`);
      return auditLogs;
    },

    async runScan() {
      return request('/api/admin/scan', { method: 'POST' });
    },
  },

  analytics: {
    async portfolio() {
      return request('/api/analytics/portfolio');
    },

    async leaderboard() {
      const { leaderboard } = await request('/api/analytics/leaderboard');
      return leaderboard;
    },

    async volumeHistory(days = 30) {
      const { history } = await request(`/api/analytics/volume-history?days=${days}`);
      return history;
    },
  },

  // WebSocket connection
  createWebSocket() {
    const wsBaseUrl = DEFAULT_BASE_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBaseUrl}/ws`);

    ws.onopen = () => {
      const token = getStoredToken();
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    return ws;
  },
};

export function clearPlatformSession() {
  setStoredToken(null);
  setRefreshToken(null);
}

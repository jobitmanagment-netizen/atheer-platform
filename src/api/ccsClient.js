import { navigateToLogin } from '@/lib/navigation';

// ── Internal HTTP client with auth token management ────────────────

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8080';
const TOKEN_KEY = 'atheer_access_token';
const REFRESH_KEY = 'atheer_refresh_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {}
}
function getRefresh() {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
function setRefresh(t) {
  try { if (t) localStorage.setItem(REFRESH_KEY, t); else localStorage.removeItem(REFRESH_KEY); } catch {}
}

let refreshing = false;
let queue = [];

async function doRefresh() {
  const rt = getRefresh();
  if (!rt) throw new Error('No refresh');
  const r = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!r.ok) { setToken(null); setRefresh(null); throw new Error('Session expired'); }
  const d = await r.json();
  setToken(d.accessToken);
  return d.accessToken;
}

async function req(path, { method = 'GET', body, token, timeoutMs = 30000, auth = true } = {}) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const tok = token || getToken();
    const hdrs = { 'Content-Type': 'application/json' };
    if (auth && tok) hdrs['Authorization'] = `Bearer ${tok}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method, headers: hdrs,
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    });

    if (res.status === 401 && auth && getRefresh()) {
      if (!refreshing) {
        refreshing = true;
        try {
          const nt = await doRefresh();
          refreshing = false;
          queue.forEach(cb => cb(nt));
          queue = [];
          return req(path, { method, body, token: nt, timeoutMs, auth });
        } catch (e) {
          refreshing = false;
          queue = [];
          navigateToLogin();
          throw e;
        }
      } else {
        return new Promise((resolve, reject) => {
          queue.push(async (nt) => {
            try { resolve(await req(path, { method, body, token: nt, timeoutMs, auth })); }
            catch (e) { reject(e); }
          });
        });
      }
    }

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(payload?.error || `Request failed (${res.status})`);
      e.status = res.status;
      e.code = payload?.code || 'ERROR';
      throw e;
    }
    return payload;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Request timed out');
      e.status = 408; e.code = 'TIMEOUT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(to);
  }
}

// ── API surface ─────────────────────────────────────────────────────

const api = {
  auth: {
    async register(email, pw, name) {
      const d = await req('/api/auth/register', { method: 'POST', body: { email, password: pw, fullName: name }, auth: false });
      if (d.accessToken) setToken(d.accessToken);
      if (d.refreshToken) setRefresh(d.refreshToken);
      return d;
    },
    async login(email, pw) {
      const d = await req('/api/auth/login', { method: 'POST', body: { email, password: pw }, auth: false });
      if (d.accessToken) setToken(d.accessToken);
      if (d.refreshToken) setRefresh(d.refreshToken);
      return d;
    },
    async me() {
      const d = await req('/api/auth/me');
      return d.user || d;
    },
    async updateProfile(data) {
      const d = await req('/api/auth/profile', { method: 'PUT', body: data });
      return d.user || d;
    },
    async logout() {
      try { await req('/api/auth/logout', { method: 'POST' }); } catch {}
      setToken(null); setRefresh(null);
    },
    isLoggedIn() { return !!getToken(); },
    async ensureFirebaseUser() {
      try {
        const fb = await import('@/api/firebase');
        const u = fb.firebaseAuth.getCurrentUser();
        return u || null;
      } catch { return null; }
    },
  },

  markets: {
    async list() { const d = await req('/api/markets'); return d.markets || []; },
    async get(sym) { const d = await req(`/api/markets/${sym}`); return d.market; },
    async orderbook(sym) { return req(`/api/markets/${sym}/orderbook`); },
    async candles(sym, tf = '1h', lim = 100) { return req(`/api/markets/${sym}/candles?timeframe=${tf}&limit=${lim}`); },
    async ticker() { const d = await req('/api/ticker'); return d.tickers || {}; },
  },

  orders: {
    async create(data) { const d = await req('/api/orders', { method: 'POST', body: data }); return d.order; },
    async list(p = {}) { const q = new URLSearchParams(p).toString(); const d = await req(`/api/orders?${q}`); return d.orders || []; },
    async get(id) { const d = await req(`/api/orders/${id}`); return d.order; },
    async cancel(id) { const d = await req(`/api/orders/${id}`, { method: 'DELETE' }); return d.order; },
  },

  trades: {
    async list(p = {}) { const q = new URLSearchParams(p).toString(); const d = await req(`/api/trades?${q}`); return d.trades || []; },
  },

  wallets: {
    async list() { const d = await req('/api/wallets'); return d.wallets || []; },
    async bootstrap(currencies) { const d = await req('/api/wallets/bootstrap', { method: 'POST', body: { currencies } }); return d.wallets || []; },
    async deposit(currency, amount) { const d = await req('/api/wallets/deposit', { method: 'POST', body: { currency, amount } }); return d.wallet; },
    async fiatList() { const d = await req('/api/fiat-wallets'); return d.wallets || []; },
    async fiatCreate(currency, label) { const d = await req('/api/fiat-wallets', { method: 'POST', body: { currency, label } }); return d.wallet; },
  },

  banking: {
    async transactions(p = {}) { const q = new URLSearchParams(p).toString(); const d = await req(`/api/banking/transactions?${q}`); return d.transactions || []; },
    async deposit(data) { const d = await req('/api/banking/deposit', { method: 'POST', body: data }); return d.transaction; },
    async withdraw(data) { const d = await req('/api/banking/withdraw', { method: 'POST', body: data }); return d.transaction; },
    async transfer(data) { return req('/api/banking/transfer', { method: 'POST', body: data }); },
    async methods() { const d = await req('/api/banking/methods'); return d.methods || []; },
    async performance() { return req('/api/banking/performance'); },
  },

  kyc: {
    async submit(data) { const d = await req('/api/kyc/submit', { method: 'POST', body: data }); return d.submission; },
    async status() { return req('/api/kyc/status'); },
    async uploadDocument(id, type, url) { return req(`/api/kyc/${id}/upload`, { method: 'POST', body: { documentType: type, url } }); },
  },

  futures: {
    async positions() { const d = await req('/api/futures/positions'); return d.positions || []; },
    async open(data) { const d = await req('/api/futures/positions', { method: 'POST', body: data }); return d.position; },
    async close(id) { const d = await req(`/api/futures/positions/${id}/close`, { method: 'PUT' }); return d.position; },
    async get(id) { const d = await req(`/api/futures/positions/${id}`); return d.position; },
    async setLeverage(l) { return req('/api/futures/leverage', { method: 'POST', body: { leverage: l } }); },
  },

  bots: {
    async list() { const d = await req('/api/bots'); return d.bots || []; },
    async create(data) { const d = await req('/api/bots', { method: 'POST', body: data }); return d.bot; },
    async update(id, data) { const d = await req(`/api/bots/${id}`, { method: 'PUT', body: data }); return d.bot; },
    async start(id) { const d = await req(`/api/bots/${id}/start`, { method: 'POST' }); return d.bot; },
    async stop(id) { const d = await req(`/api/bots/${id}/stop`, { method: 'POST' }); return d.bot; },
    async delete(id) { return req(`/api/bots/${id}`, { method: 'DELETE' }); },
  },

  copyTrading: {
    async traders(p = {}) { const q = new URLSearchParams(p).toString(); const d = await req(`/api/copy-trading/traders?${q}`); return d.traders || []; },
    async getTrader(id) { const d = await req(`/api/copy-trading/traders/${id}`); return d.trader; },
    async myCopies() { const d = await req('/api/copy-trading/my-copies'); return d.copies || []; },
    async startCopy(data) { const d = await req('/api/copy-trading/copy', { method: 'POST', body: data }); return d.copyTrade; },
    async stopCopy(id) { const d = await req(`/api/copy-trading/copy/${id}/stop`, { method: 'PUT' }); return d.copyTrade; },
  },

  earn: {
    async products() { return req('/api/earn/products'); },
    async stake(data) { const d = await req('/api/earn/stake', { method: 'POST', body: data }); return d.position; },
    async positions() { return req('/api/earn/positions'); },
    async addLiquidity(data) { const d = await req('/api/earn/liquidity', { method: 'POST', body: data }); return d.session; },
    async withdrawLiquidity(id) { const d = await req(`/api/earn/liquidity/${id}/withdraw`, { method: 'POST' }); return d.session; },
  },

  priceAlerts: {
    async list() { const d = await req('/api/price-alerts'); return d.alerts || []; },
    async create(data) { const d = await req('/api/price-alerts', { method: 'POST', body: data }); return d.alert; },
    async toggle(id) { const d = await req(`/api/price-alerts/${id}/toggle`, { method: 'PUT' }); return d.alert; },
    async delete(id) { return req(`/api/price-alerts/${id}`, { method: 'DELETE' }); },
  },

  rewards: {
    async get() { return req('/api/rewards'); },
  },

  notifications: {
    async list(p = {}) { const q = new URLSearchParams(p).toString(); return req(`/api/notifications?${q}`); },
    async markRead(id) { const d = await req(`/api/notifications/${id}/read`, { method: 'PUT' }); return d.notification; },
    async markAllRead() { return req('/api/notifications/read-all', { method: 'PUT' }); },
  },

  admin: {
    async stats() { return req('/api/admin/stats'); },
    async users() { const d = await req('/api/admin/users'); return d.users || []; },
    async updateUser(id, data) { const d = await req(`/api/admin/users/${id}`, { method: 'PUT', body: data }); return d.user; },
    async threats() { const d = await req('/api/admin/threats'); return d.threats || []; },
    async resolveThreat(id) { const d = await req(`/api/admin/threats/${id}/resolve`, { method: 'PUT' }); return d.threat; },
    async auditLogs(p = {}) { const q = new URLSearchParams(p).toString(); const d = await req(`/api/admin/audit-logs?${q}`); return d.auditLogs || []; },
    async runScan() { return req('/api/admin/scan', { method: 'POST' }); },
  },

  analytics: {
    async portfolio() { return req('/api/analytics/portfolio'); },
    async leaderboard() { const d = await req('/api/analytics/leaderboard'); return d.leaderboard || []; },
    async volumeHistory(days = 30) { const d = await req(`/api/analytics/volume-history?days=${days}`); return d.history || []; },
  },
};

// ── Legacy ccs compatibility layer ─────────────────────────────────

function entityProxy(name) {
  return {
    async list(sort, limit) {
      const p = {};
      if (sort) p.sort = sort;
      if (limit) p.limit = limit;
      const q = new URLSearchParams(p).toString();
      try { const d = await req(`/api/entities/${name}?${q}`); return d.data || []; } catch { return []; }
    },
    async filter(query = {}, sort, limit) {
      const p = { ...query };
      if (sort) p.sort = sort;
      if (limit) p.limit = limit;
      const q = new URLSearchParams(p).toString();
      try { const d = await req(`/api/entities/${name}/filter?${q}`); return d.data || []; } catch { return []; }
    },
    async get(id) { try { const d = await req(`/api/entities/${name}/${id}`); return d.data; } catch { return null; } },
    async create(data) { try { const d = await req(`/api/entities/${name}`, { method: 'POST', body: data }); return d.data; } catch { return null; } },
    async update(id, patch) { try { const d = await req(`/api/entities/${name}/${id}`, { method: 'PUT', body: patch }); return d.data; } catch { return null; } },
    async delete(id) { try { await req(`/api/entities/${name}/${id}`, { method: 'DELETE' }); return true; } catch { return false; } },
    remove(id) { return this.delete(id); },
    subscribe() { return () => {}; },
  };
}

export const ccs = new Proxy({ ...api, request: req }, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (prop === 'entities') {
      return new Proxy({}, { get(_, name) { return entityProxy(name); } });
    }
    if (prop === 'setToken') return () => {};
    return undefined;
  },
});

export const atheer = ccs;

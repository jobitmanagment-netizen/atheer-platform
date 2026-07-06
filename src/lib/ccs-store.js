// CCS Technology owned local store.
//
// This module provides a tiny persistent collection layer with the same shape
// the app previously expected from the remote CMS client. It is intentionally generic so it
// can back both the corporate CMS data and the product data used throughout the
// trading experience.

const PREFIX = 'ccs_store_';
const memoryStore = new Map();
const listeners = new Map();

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStore;
  }
  return window.localStorage;
}

function read(collection) {
  const storage = getStorage();
  try {
    const raw = storage.getItem ? storage.getItem(PREFIX + collection) : storage.get(PREFIX + collection);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emit(collection, rows) {
  const subs = listeners.get(collection);
  if (!subs || subs.size === 0) return;
  for (const callback of subs) {
    try {
      callback(rows);
    } catch {
      // Subscription errors must never break CRUD operations.
    }
  }
}

function write(collection, rows) {
  const storage = getStorage();
  const serialized = JSON.stringify(rows);
  try {
    if (storage.setItem) {
      storage.setItem(PREFIX + collection, serialized);
    } else {
      storage.set(PREFIX + collection, serialized);
    }
  } catch {
    // Quota or serialization issues are non-fatal for the local store.
  }
  emit(collection, rows);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeSort(sort) {
  if (!sort) return null;
  if (typeof sort === 'object' && sort.field) {
    return { field: String(sort.field), direction: sort.direction === 'asc' ? 1 : -1 };
  }
  const value = String(sort).trim();
  if (!value) return null;
  return value.startsWith('-')
    ? { field: value.slice(1), direction: -1 }
    : { field: value, direction: 1 };
}

function fieldValue(row, field) {
  if (field in row) return row[field];
  if (field === 'created_date' && row.createdAt) return row.createdAt;
  if (field === 'createdAt' && row.created_date) return row.created_date;
  if (field === 'updated_date' && row.updatedAt) return row.updatedAt;
  if (field === 'updatedAt' && row.updated_date) return row.updated_date;
  return undefined;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const aDate = Date.parse(a);
  const bDate = Date.parse(b);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return aDate - bDate;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

function selectFields(row, fields) {
  if (!fields) return row;
  const list = Array.isArray(fields)
    ? fields
    : String(fields).split(',').map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return row;
  const projected = { id: row.id };
  for (const field of list) {
    if (field in row) projected[field] = row[field];
  }
  return projected;
}

function nextId(rows, prefix) {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const numericSeed = rows.reduce((max, row) => {
    const match = String(row.id || '').match(/(\d+)$/);
    if (!match) return max;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return prefix ? `${prefix}${numericSeed + 1}-${suffix.slice(0, 8)}` : suffix;
}

function ensure(collection, seed) {
  const existing = read(collection);
  if (existing) return existing;
  const rows = typeof seed === 'function' ? seed() : seed || [];
  write(collection, rows);
  return rows;
}

function queryRows(rows, query = {}) {
  return rows.filter((row) => Object.entries(query || {}).every(([key, expected]) => {
    const actual = row[key];
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    if (expected && typeof expected === 'object') {
      if (Object.prototype.hasOwnProperty.call(expected, 'in')) {
        return Array.isArray(expected.in) && expected.in.includes(actual);
      }
      if (Object.prototype.hasOwnProperty.call(expected, 'neq')) {
        return actual !== expected.neq;
      }
    }
    return actual === expected;
  }));
}

function applyListOptions(rows, sort, limit, skip, fields) {
  const normalizedSort = normalizeSort(sort);
  let next = [...rows];
  if (normalizedSort) {
    next.sort((left, right) => compare(fieldValue(left, normalizedSort.field), fieldValue(right, normalizedSort.field)) * normalizedSort.direction);
  }
  if (typeof skip === 'number' && skip > 0) {
    next = next.slice(skip);
  }
  if (typeof limit === 'number' && limit >= 0) {
    next = next.slice(0, limit);
  }
  return next.map((row) => selectFields(row, fields));
}

function subscribe(collection, callback) {
  if (!listeners.has(collection)) {
    listeners.set(collection, new Set());
  }
  const subs = listeners.get(collection);
  subs.add(callback);
  return () => {
    subs.delete(callback);
    if (subs.size === 0) listeners.delete(collection);
  };
}

export function makeCollection(name, seed, idPrefix = '') {
  return {
    list(sort, limit, skip, fields) {
      const rows = ensure(name, seed);
      return applyListOptions(rows, sort, limit, skip, fields);
    },
    filter(query = {}, sort, limit, skip, fields) {
      const rows = ensure(name, seed);
      const filtered = queryRows(rows, query);
      return applyListOptions(filtered, sort, limit, skip, fields);
    },
    get(id) {
      return ensure(name, seed).find((row) => row.id === id) || null;
    },
    create(data = {}, stampISO) {
      const rows = ensure(name, seed);
      const timestamp = stampISO || new Date().toISOString();
      const row = {
        id: data.id || nextId(rows, idPrefix),
        createdAt: data.createdAt || timestamp,
        created_date: data.created_date || timestamp,
        updatedAt: data.updatedAt || timestamp,
        updated_date: data.updated_date || timestamp,
        ...clone(data),
      };
      const next = [row, ...rows];
      write(name, next);
      return row;
    },
    update(id, patch = {}) {
      const rows = ensure(name, seed);
      let updated = null;
      const timestamp = new Date().toISOString();
      const next = rows.map((row) => {
        if (row.id !== id) return row;
        updated = { ...row, ...clone(patch), updatedAt: timestamp, updated_date: timestamp };
        return updated;
      });
      write(name, next);
      return updated;
    },
    delete(id) {
      const rows = ensure(name, seed);
      write(name, rows.filter((row) => row.id !== id));
      return true;
    },
    remove(id) {
      return this.delete(id);
    },
    replaceAll(rows = []) {
      write(name, clone(rows));
      return rows;
    },
    subscribe(callback) {
      return subscribe(name, callback);
    },
  };
}

export { ensure, read, write, queryRows, applyListOptions };

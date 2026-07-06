/**
 * Response Cache Manager - Smart caching strategy for API responses
 * Handles cache invalidation, stale data, and preloading
 */

import { logger } from '@/lib/logger';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 hours for stale fallback

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.tags = new Map(); // Map of tags to cache keys for invalidation
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  // Generate cache key from request info
  generateKey(method, url, params = {}) {
    return `${method}:${url}:${JSON.stringify(params)}`;
  }

  // Check if cache entry is still valid
  isValid(entry) {
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < entry.ttl;
  }

  // Check if cache entry is stale but usable
  isStale(entry) {
    if (!entry) return true;
    const age = Date.now() - entry.timestamp;
    return age > entry.ttl && age < STALE_TTL;
  }

  // Get from cache (returns null if expired)
  get(method, url, params = {}) {
    const key = this.generateKey(method, url, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug('CACHE', 'Cache miss', { key });
      return null;
    }

    if (this.isValid(entry)) {
      this.stats.hits++;
      logger.debug('CACHE', 'Cache hit', { key, age: Date.now() - entry.timestamp });
      return entry.data;
    }

    // Return stale data but mark for refresh
    if (this.isStale(entry)) {
      logger.debug('CACHE', 'Stale data returned', { key, age: Date.now() - entry.timestamp });
      return entry.data;
    }

    // Expired
    this.cache.delete(key);
    this.stats.misses++;
    return null;
  }

  // Set cache entry
  set(method, url, data, params = {}, options = {}) {
    const key = this.generateKey(method, url, params);
    const ttl = options.ttl || DEFAULT_TTL;
    const tags = options.tags || [];

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      size: JSON.stringify(data).length
    });

    // Track tags for batch invalidation
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, []);
      }
      this.tags.get(tag).push(key);
    });

    logger.debug('CACHE', 'Cache set', { key, ttl, tags });
  }

  // Invalidate cache by key
  invalidate(method, url, params = {}) {
    const key = this.generateKey(method, url, params);
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.invalidations++;
      logger.info('CACHE', 'Cache invalidated', { key });
      return true;
    }
    return false;
  }

  // Invalidate all cache entries with specific tag
  invalidateTag(tag) {
    const keys = this.tags.get(tag) || [];
    let count = 0;

    keys.forEach(key => {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        count++;
      }
    });

    this.tags.delete(tag);
    this.stats.invalidations += count;

    logger.info('CACHE', `Invalidated ${count} entries by tag`, { tag });
    return count;
  }

  // Invalidate all cache entries
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.tags.clear();
    this.stats.invalidations += count;
    logger.info('CACHE', `Cleared all cache (${count} entries)`);
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

    return {
      ...this.stats,
      entries: this.cache.size,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  // Debug: Get all cache keys
  getKeys() {
    return Array.from(this.cache.keys());
  }

  // Preload cache with data (useful for optimistic updates)
  preload(method, url, data, params = {}, options = {}) {
    this.set(method, url, data, params, { ttl: 2 * 60 * 1000, ...options });
    logger.debug('CACHE', 'Cache preloaded', { 
      key: this.generateKey(method, url, params) 
    });
  }
}

export const cacheManager = new CacheManager();

export default CacheManager;

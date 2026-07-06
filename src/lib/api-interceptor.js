/**
 * API Interceptor - Adds logging, error handling, retry logic, and performance tracking
 * Integrates with axios or fetch-based API clients
 */

import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/error-handler';
import { perfMonitor } from '@/lib/perf-monitor';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TIMEOUT = 30000;

// Exponential backoff for retries
function getRetryDelay(attempt) {
  return RETRY_DELAY * Math.pow(2, attempt);
}

// Determine if error is retryable
function isRetryableError(error) {
  if (!error.status) return true; // Network error
  // Retry on 408, 429, 5xx
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

export class APIInterceptor {
  constructor(client) {
    this.client = client;
    this.requestCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Create cache key from request config
  getCacheKey(method, url, params) {
    // Only cache GET requests
    if (method.toUpperCase() !== 'GET') return null;
    return `${method}:${url}:${JSON.stringify(params || {})}`;
  }

  // Check if cached response is still valid
  isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTTL;
  }

  // Perform request with retry logic and caching
  async request(method, url, data = {}, options = {}) {
    const { params = {}, ignoreCache = false, timeout = TIMEOUT } = options;

    // Check cache for GET requests
    if (method === 'GET' && !ignoreCache) {
      const cacheKey = this.getCacheKey(method, url, params);
      if (cacheKey && this.requestCache.has(cacheKey)) {
        const cached = this.requestCache.get(cacheKey);
        if (this.isCacheValid(cached)) {
          logger.debug('CACHE', `Cache hit: ${method} ${url}`);
          return cached.data;
        }
      }
    }

    let lastError;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        const startTime = performance.now();
        
        logger.debug('API_REQ', `${method} ${url}`, {
          attempt: attempt + 1,
          params,
          timeout
        });

        // Make the actual request based on client type
        let response;
        if (this.client.request) {
          // Axios-style client
          response = await Promise.race([
            this.client.request({
              method,
              url,
              data: method !== 'GET' ? data : undefined,
              params,
              timeout
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
          ]);
        } else {
          // Fetch-style client
          response = await Promise.race([
            this.makeRequest(method, url, data, params),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
          ]);
        }

        const duration = performance.now() - startTime;
        perfMonitor.trackAPICall(method, url, duration, response.status);

        logger.info('API_RES', `${method} ${url}`, {
          status: response.status,
          duration: `${duration.toFixed(2)}ms`
        });

        // Cache successful GET responses
        if (method === 'GET' && response.status < 400) {
          const cacheKey = this.getCacheKey(method, url, params);
          if (cacheKey) {
            this.requestCache.set(cacheKey, {
              data: response.data,
              timestamp: Date.now()
            });
          }
        }

        return response.data;
      } catch (error) {
        lastError = error;
        const isRetryable = isRetryableError(error);
        const shouldRetry = isRetryable && attempt < MAX_RETRIES;

        logger.warn('API_ERR', `${method} ${url} (attempt ${attempt + 1})`, {
          error: error.message,
          status: error.status,
          isRetryable,
          willRetry: shouldRetry
        });

        if (!shouldRetry) {
          break;
        }

        attempt++;
        const delay = getRetryDelay(attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted, handle the error
    const appError = ErrorHandler.handle(lastError);
    logger.error('API_FAIL', `${method} ${url} exhausted retries`, {
      error: appError.message,
      code: appError.code
    });

    throw appError;
  }

  // Simple fetch-based request (fallback)
  async makeRequest(method, url, data, params) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });

    return {
      status: response.status,
      data: await response.json()
    };
  }

  // Clear cache
  clearCache() {
    this.requestCache.clear();
    logger.info('CACHE', 'Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      cacheSize: this.requestCache.size,
      entries: Array.from(this.requestCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp
      }))
    };
  }
}

export default APIInterceptor;

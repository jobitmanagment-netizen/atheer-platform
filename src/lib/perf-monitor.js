/**
 * Performance Monitor - Tracks Core Web Vitals and custom metrics
 * Measures: LCP, FID, CLS, FCP, and API performance
 */

import { logger } from '@/lib/logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.marks = {};
    this.measures = {};
    this.apiMetrics = [];
  }

  // Mark a point in time
  mark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.marks[name] = Date.now();
    }
  }

  // Measure time between two marks
  measure(name, startMark, endMark) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        this.measures[name] = measure.duration;
        logger.debug('PERF', `Measure: ${name}`, { duration: measure.duration });
        return measure.duration;
      } catch (e) {
        logger.warn('PERF', 'Failed to measure', { name, error: e.message });
      }
    }
  }

  // Track API call performance
  trackAPICall(method, url, duration, status) {
    const metric = {
      timestamp: new Date().toISOString(),
      method,
      url,
      duration,
      status,
      slow: duration > 3000,
    };
    this.apiMetrics.push(metric);

    if (metric.slow) {
      logger.warn('API_PERF', `Slow API call: ${method} ${url}`, { duration, status });
    }

    if (this.apiMetrics.length > 100) {
      this.apiMetrics.shift();
    }
  }

  // Track Core Web Vitals using PerformanceObserver
  initWebVitals() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        logger.info('VITALS', 'LCP recorded', { lcp: this.metrics.LCP });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: true });
    } catch (e) {
      logger.debug('VITALS', 'LCP observer failed', { error: e.message });
    }

    // Cumulative Layout Shift (CLS)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.CLS = entries.reduce((acc, entry) => {
          if (!entry.hadRecentInput) {
            return acc + entry.value;
          }
          return acc;
        }, 0);
        logger.info('VITALS', 'CLS recorded', { cls: this.metrics.CLS });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true });
    } catch (e) {
      logger.debug('VITALS', 'CLS observer failed', { error: e.message });
    }

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    try {
      const inputObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        this.metrics.FID = firstEntry.processingDuration;
        logger.info('VITALS', 'FID recorded', { fid: this.metrics.FID });
      });
      inputObserver.observe({ entryTypes: ['first-input'], buffered: true });
    } catch (e) {
      logger.debug('VITALS', 'FID observer failed', { error: e.message });
    }
  }

  // Get all metrics
  getMetrics() {
    return {
      vitals: this.metrics,
      measures: this.measures,
      apiMetrics: this.apiMetrics,
      timestamp: new Date().toISOString()
    };
  }

  // Get API performance summary
  getAPISummary() {
    if (this.apiMetrics.length === 0) {
      return null;
    }

    const durations = this.apiMetrics.map(m => m.duration);
    const slowCalls = this.apiMetrics.filter(m => m.slow).length;

    return {
      totalCalls: this.apiMetrics.length,
      slowCalls,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      errorRate: (this.apiMetrics.filter(m => m.status >= 400).length / this.apiMetrics.length) * 100
    };
  }

  // Report metrics
  report() {
    const summary = this.getAPISummary();
    logger.info('PERF_REPORT', 'Performance summary', {
      vitals: this.metrics,
      api: summary
    });
  }
}

export const perfMonitor = new PerformanceMonitor();

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    perfMonitor.initWebVitals();
  });
}

export default perfMonitor;

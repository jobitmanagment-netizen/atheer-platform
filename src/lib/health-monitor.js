/**
 * App Health Monitor - Monitor application health and resource usage
 * Tracks memory, performance, connectivity, and API health
 */

import { logger } from '@/lib/logger';
import { perfMonitor } from '@/lib/perf-monitor';

class HealthMonitor {
  constructor() {
    this.health = {
      status: 'healthy',
      checks: {},
      timestamp: Date.now(),
      memory: null,
      connectivity: true
    };
    this.checkInterval = 30000; // Check every 30 seconds
    this.healthHistory = [];
    this.maxHistory = 100;
    
    this.startMonitoring();
  }

  // Start periodic health checks
  startMonitoring() {
    if (typeof window === 'undefined') return;

    this.checkHealth();
    this.intervalId = setInterval(() => this.checkHealth(), this.checkInterval);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // Perform all health checks
  async checkHealth() {
    try {
      const checks = {
        memory: this.checkMemory(),
        performance: this.checkPerformance(),
        connectivity: this.checkConnectivity(),
        localStorage: this.checkLocalStorage()
      };

      this.health = {
        status: this.determineStatus(checks),
        checks,
        timestamp: Date.now(),
        memory: this.getMemoryInfo()
      };

      this.healthHistory.push(this.health);
      if (this.healthHistory.length > this.maxHistory) {
        this.healthHistory.shift();
      }

      if (this.health.status !== 'healthy') {
        logger.warn('HEALTH', `App health degraded: ${this.health.status}`, {
          checks: this.health.checks
        });
      }
    } catch (error) {
      logger.error('HEALTH', 'Health check failed', { error: error.message });
    }
  }

  // Check memory usage
  checkMemory() {
    if (typeof performance === 'undefined' || !performance.memory) {
      return { status: 'unknown' };
    }

    const memory = performance.memory;
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'healthy',
      usagePercent: usagePercent.toFixed(2),
      usedMB: (memory.usedJSHeapSize / 1048576).toFixed(2),
      limitMB: (memory.jsHeapSizeLimit / 1048576).toFixed(2)
    };
  }

  // Check performance metrics
  checkPerformance() {
    const metrics = perfMonitor.getMetrics();
    const apiSummary = perfMonitor.getAPISummary();

    return {
      status: apiSummary && apiSummary.errorRate > 20 ? 'warning' : 'healthy',
      vitals: metrics.vitals,
      apiHealth: apiSummary
    };
  }

  // Check connectivity
  checkConnectivity() {
    return {
      status: typeof navigator !== 'undefined' && navigator.onLine ? 'healthy' : 'offline',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    };
  }

  // Check localStorage availability
  checkLocalStorage() {
    try {
      const testKey = 'health_check_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { status: 'healthy' };
    } catch (e) {
      return { status: 'critical', error: e.message };
    }
  }

  // Determine overall status
  determineStatus(checks) {
    const statuses = Object.values(checks).map(c => c.status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'degraded';
    return 'healthy';
  }

  // Get memory info
  getMemoryInfo() {
    if (typeof performance === 'undefined' || !performance.memory) {
      return null;
    }

    return {
      usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
      usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
    };
  }

  // Get current health status
  getStatus() {
    return this.health;
  }

  // Get health history
  getHistory() {
    return [...this.healthHistory];
  }

  // Get health summary
  getSummary() {
    const totalChecks = this.healthHistory.length;
    if (totalChecks === 0) return null;

    const statuses = this.healthHistory.map(h => h.status);
    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const degradedCount = statuses.filter(s => s === 'degraded').length;
    const criticalCount = statuses.filter(s => s === 'critical').length;

    return {
      healthyPercent: ((healthyCount / totalChecks) * 100).toFixed(2),
      degradedPercent: ((degradedCount / totalChecks) * 100).toFixed(2),
      criticalPercent: ((criticalCount / totalChecks) * 100).toFixed(2),
      totalChecks,
      lastCheck: this.health.timestamp
    };
  }

  // Manually trigger health check
  forceCheck() {
    this.checkHealth();
    return this.health;
  }
}

export const healthMonitor = new HealthMonitor();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    healthMonitor.stopMonitoring();
  });
}

export default HealthMonitor;

/**
 * Analytics Service - Track user behavior and app performance
 * Non-intrusive, respects privacy, can be disabled
 */

import { logger } from '@/lib/logger';

class AnalyticsService {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.events = [];
    this.maxEvents = 1000;
    this.startTime = Date.now();
    
    logger.info('ANALYTICS', 'Analytics service initialized', { 
      sessionId: this.sessionId,
      enabled 
    });
  }

  // Generate unique session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Enable/disable analytics
  setEnabled(enabled) {
    this.enabled = enabled;
    logger.info('ANALYTICS', `Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Set user ID for tracking
  setUserId(userId) {
    this.userId = userId;
    logger.debug('ANALYTICS', 'User ID set', { userId });
  }

  // Track page view
  trackPageView(pathname, title = '') {
    if (!this.enabled) return;

    this.trackEvent('page_view', {
      pathname,
      title,
      timestamp: Date.now(),
      sessionDuration: Date.now() - this.startTime
    });
  }

  // Track user action
  trackEvent(eventName, data = {}) {
    if (!this.enabled) return;

    const event = {
      eventName,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(event);

    // Maintain max events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    logger.debug('ANALYTICS', `Event tracked: ${eventName}`, data);

    // Auto-flush if too many events
    if (this.events.length > this.maxEvents * 0.9) {
      this.flush();
    }
  }

  // Track trading action
  trackTrade(action, data = {}) {
    this.trackEvent('trade_action', {
      action,
      ...data,
      timestamp: Date.now()
    });
  }

  // Track error event
  trackError(errorCode, message, context = {}) {
    this.trackEvent('error', {
      errorCode,
      message,
      context,
      url: typeof window !== 'undefined' ? window.location.href : 'N/A'
    });
  }

  // Track performance metric
  trackMetric(metricName, value, unit = 'ms') {
    this.trackEvent('metric', {
      metricName,
      value,
      unit,
      timestamp: Date.now()
    });
  }

  // Track API call
  trackAPICall(method, endpoint, duration, status) {
    this.trackEvent('api_call', {
      method,
      endpoint,
      duration,
      status,
      slow: duration > 3000
    });
  }

  // Get all events
  getEvents() {
    return [...this.events];
  }

  // Get event summary
  getSummary() {
    const eventTypes = {};
    this.events.forEach(e => {
      eventTypes[e.eventName] = (eventTypes[e.eventName] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.startTime,
      eventTypes,
      sessionId: this.sessionId,
      userId: this.userId
    };
  }

  // Prepare events for sending (batch)
  prepareBatch() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      batchSize: this.events.length,
      timestamp: Date.now(),
      events: this.events
    };
  }

  // Clear events after sending
  flush() {
    const batch = this.prepareBatch();
    logger.debug('ANALYTICS', 'Events flushed', { 
      batchSize: batch.batchSize 
    });
    // Here you would send the batch to your analytics backend
    // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(batch) })
    this.events = [];
    return batch;
  }

  // Clear all events
  clear() {
    this.events = [];
    logger.info('ANALYTICS', 'Analytics cleared');
  }

  // Export as CSV (for debugging)
  exportAsCSV() {
    if (this.events.length === 0) return '';

    const headers = ['Timestamp', 'Event', 'User ID', 'Data'];
    const rows = this.events.map(e => [
      new Date(e.timestamp).toISOString(),
      e.eventName,
      e.userId || 'anonymous',
      JSON.stringify(e.data)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    return csv;
  }
}

// Create singleton instance
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const analyticsEnabled = env.VITE_APP_ENV !== 'production' || env.VITE_ENABLE_ANALYTICS !== 'false';

export const analytics = new AnalyticsService(analyticsEnabled);

export default AnalyticsService;

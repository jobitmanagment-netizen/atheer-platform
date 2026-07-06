/**
 * Logger Service - Production-grade logging with levels and environment awareness
 * Captures errors, warnings, and info messages with structured data
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(enableLogging = true, logLevel = 'INFO') {
    this.enableLogging = enableLogging;
    this.logLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.INFO;
    this.logs = [];
    this.maxLogs = 500;
  }

  normalizeArgs(categoryOrMessage, messageOrData, dataMaybe) {
    if (typeof messageOrData === 'undefined') {
      return {
        category: 'APP',
        message: String(categoryOrMessage),
        data: {},
      };
    }

    if (typeof messageOrData === 'object' && messageOrData !== null && typeof dataMaybe === 'undefined') {
      return {
        category: 'APP',
        message: String(categoryOrMessage),
        data: messageOrData,
      };
    }

    return {
      category: String(categoryOrMessage),
      message: String(messageOrData),
      data: dataMaybe || {},
    };
  }

  private(level, categoryOrMessage, messageOrData, dataMaybe) {
    const { category, message, data } = this.normalizeArgs(categoryOrMessage, messageOrData, dataMaybe);
    if (this.logLevel > LOG_LEVELS[level]) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.enableLogging) {
      const prefix = `[${level}] ${category}`;
      const logData = Object.keys(data).length > 0 ? data : '';

      switch (level) {
        case 'ERROR':
          console.error(prefix, message, logData);
          break;
        case 'WARN':
          console.warn(prefix, message, logData);
          break;
        case 'INFO':
          console.info(prefix, message, logData);
          break;
        case 'DEBUG':
          console.debug(prefix, message, logData);
          break;
      }
    }
  }

  debug(category, message, data) {
    this.private('DEBUG', category, message, data);
  }

  info(category, message, data) {
    this.private('INFO', category, message, data);
  }

  warn(category, message, data) {
    this.private('WARN', category, message, data);
  }

  error(category, message, data) {
    this.private('ERROR', category, message, data);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }
    return this.logs.map(log => 
      `${log.timestamp} [${log.level}] ${log.category}: ${log.message}`
    ).join('\n');
  }
}

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const enableLogging = env.VITE_ENABLE_LOGGING === 'true';
const logLevel = env.VITE_LOG_LEVEL || 'INFO';

export const logger = new Logger(enableLogging, logLevel);

if (typeof window !== 'undefined' && !enableLogging) {
  const silent = () => {};
  console.log = silent;
  console.info = silent;
  console.debug = silent;
  console.warn = silent;
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('GLOBAL_ERROR', 'Uncaught Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.toString()
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('UNHANDLED_REJECTION', 'Unhandled Promise Rejection', {
      reason: event.reason?.toString?.() || String(event.reason)
    });
  });
}

export default logger;

/**
 * Error Handler - Comprehensive error handling with user-friendly messages
 * Handles API errors, auth errors, and network issues
 */

import { logger } from '@/lib/logger';
import { navigateToLogin } from '@/lib/navigation';

class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// User-friendly error messages mapped to error codes
const ERROR_MESSAGES = {
  // Network errors
  'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
  'TIMEOUT_ERROR': 'Request timed out. Please try again.',
  'OFFLINE_ERROR': 'You are currently offline. Some features may be limited.',

  // Authentication errors
  'AUTH_FAILED': 'Authentication failed. Please log in again.',
  'INVALID_CREDENTIALS': 'Invalid email or password.',
  'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
  'PERMISSION_DENIED': 'You do not have permission to access this resource.',
  'UNAUTHORIZED': 'Unauthorized access. Please log in.',

  // API errors
  'BAD_REQUEST': 'Invalid request. Please check your input.',
  'NOT_FOUND': 'Resource not found.',
  'CONFLICT': 'Resource conflict. Please refresh and try again.',
  'RATE_LIMIT': 'Too many requests. Please wait a moment and try again.',
  'SERVER_ERROR': 'Server error. Please try again later.',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',

  // Business logic errors
  'INSUFFICIENT_BALANCE': 'Insufficient balance for this transaction.',
  'INVALID_ORDER': 'Invalid order parameters.',
  'ORDER_NOT_FOUND': 'Order not found.',

  // Default
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
};

export function getUserFriendlyMessage(errorCode, customMessage = null) {
  return customMessage || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['UNKNOWN_ERROR'];
}

export class ErrorHandler {
  static handleNetworkError(error) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const code = isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR';
    
    logger.error('NETWORK', 'Network error occurred', {
      message: error.message,
      code: error.code,
      isTimeout
    });

    return new AppError(
      getUserFriendlyMessage(code),
      code,
      { originalError: error }
    );
  }

  static handleAuthError(status, data) {
    let code = 'AUTH_FAILED';
    
    if (status === 401) code = 'UNAUTHORIZED';
    if (status === 403) code = 'PERMISSION_DENIED';
    if (data?.error?.includes('expired')) code = 'SESSION_EXPIRED';
    if (data?.error?.includes('credentials')) code = 'INVALID_CREDENTIALS';

    logger.warn('AUTH', 'Authentication error', { status, code });

    if (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') {
      navigateToLogin();
    }

    return new AppError(
      getUserFriendlyMessage(code),
      code,
      { status, data }
    );
  }

  static handleAPIError(status, data) {
    let code = 'UNKNOWN_ERROR';

    if (status === 400) code = 'BAD_REQUEST';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 409) code = 'CONFLICT';
    else if (status === 429) code = 'RATE_LIMIT';
    else if (status >= 500) code = 'SERVER_ERROR';
    else if (status === 503) code = 'SERVICE_UNAVAILABLE';

    // Check for specific business logic errors
    const errorMsg = data?.error || data?.message || '';
    if (errorMsg.includes('balance')) code = 'INSUFFICIENT_BALANCE';
    if (errorMsg.includes('order')) code = errorMsg.includes('not found') ? 'ORDER_NOT_FOUND' : 'INVALID_ORDER';

    logger.error('API', 'API error', { status, code, data });

    return new AppError(
      getUserFriendlyMessage(code, data?.message),
      code,
      { status, data }
    );
  }

  static handle(error, context = {}) {
    if (error instanceof AppError) {
      return error;
    }

    // Network error
    if (!error.status) {
      return this.handleNetworkError(error);
    }

    // Auth error
    if (error.status === 401 || error.status === 403) {
      return this.handleAuthError(error.status, error.data);
    }

    // API error
    return this.handleAPIError(error.status, error.data);
  }
}

export default AppError;

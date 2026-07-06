/**
 * Global navigation utility - allows imperative navigation outside React components
 * This is used by auth layer and error handlers that need to redirect users
 */

import { logger } from '@/lib/logger';

let globalNavigate = null;

export function setGlobalNavigate(navigate) {
  globalNavigate = navigate;
}

export function getGlobalNavigate() {
  return globalNavigate;
}

export function navigateTo(path, options = {}) {
  if (globalNavigate) {
    globalNavigate(path, { replace: true, ...options });
  } else {
    // Fallback for edge cases where provider isn't available
    logger.warn('Navigation', 'Global navigator not initialized, falling back to window.location', { path });
    window.location.href = path;
  }
}

export function navigateToLogin() {
  navigateTo('/login');
}

export function navigateToDashboard() {
  navigateTo('/dashboard');
}

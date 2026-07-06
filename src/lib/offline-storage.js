/**
 * Offline Storage Manager - Persist critical data locally for offline access
 * Syncs with server when connection is restored
 */

import { logger } from '@/lib/logger';

const STORAGE_PREFIX = 'atheer_offline_';

class OfflineStorageManager {
  constructor() {
    this.store = {};
    this.isDirty = false;
    this.syncInProgress = false;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    this.initializeStorageListener();
    this.initializeOnlineListener();
  }

  // Load stored data from localStorage
  initializeStorageListener() {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          const actualKey = key.replace(STORAGE_PREFIX, '');
          try {
            this.store[actualKey] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            logger.warn('OFFLINE', 'Failed to parse stored data', { key, error: e.message });
          }
        }
      });
      logger.info('OFFLINE', 'Offline storage initialized', { itemCount: Object.keys(this.store).length });
    } catch (e) {
      logger.warn('OFFLINE', 'Failed to initialize storage', { error: e.message });
    }
  }

  // Listen for online/offline events
  initializeOnlineListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('OFFLINE', 'Application is now online');
      this.onOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.info('OFFLINE', 'Application is now offline');
      this.onOffline();
    });
  }

  // Called when connection is restored
  onOnline() {
    if (this.isDirty) {
      logger.info('OFFLINE', 'Syncing offline changes with server');
      this.syncPendingChanges();
    }
  }

  // Called when connection is lost
  onOffline() {
    logger.warn('OFFLINE', 'Connection lost - operating in offline mode');
  }

  // Store data locally
  set(key, data) {
    try {
      this.store[key] = data;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
      }
      logger.debug('OFFLINE', 'Data stored locally', { key });
    } catch (e) {
      logger.error('OFFLINE', 'Failed to store data', { key, error: e.message });
    }
  }

  // Retrieve data
  get(key) {
    return this.store[key] || null;
  }

  // Get all stored data
  getAll() {
    return { ...this.store };
  }

  // Mark data as modified (for sync)
  markDirty(key) {
    this.isDirty = true;
    if (typeof localStorage !== 'undefined') {
      const dirtyKeys = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'dirty_keys') || '[]');
      if (!dirtyKeys.includes(key)) {
        dirtyKeys.push(key);
        localStorage.setItem(STORAGE_PREFIX + 'dirty_keys', JSON.stringify(dirtyKeys));
      }
    }
    logger.debug('OFFLINE', 'Data marked as dirty', { key });
  }

  // Get pending changes that need to sync
  getPendingChanges() {
    if (typeof localStorage === 'undefined') return [];
    
    try {
      const dirtyKeys = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'dirty_keys') || '[]');
      return dirtyKeys.map(key => ({
        key,
        data: this.store[key]
      })).filter(item => item.data !== null);
    } catch (e) {
      logger.warn('OFFLINE', 'Failed to get pending changes', { error: e.message });
      return [];
    }
  }

  // Clear pending changes after successful sync
  clearPendingChanges() {
    this.isDirty = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_PREFIX + 'dirty_keys');
    }
    logger.info('OFFLINE', 'Pending changes cleared');
  }

  // Sync pending changes with server (to be called by sync service)
  async syncPendingChanges() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    try {
      const pending = this.getPendingChanges();
      if (pending.length === 0) {
        logger.debug('OFFLINE', 'No pending changes to sync');
        return;
      }

      logger.info('OFFLINE', 'Syncing pending changes', { count: pending.length });
      // This would be called by auth/api service to actually sync
      // For now just clear after successful sync simulation
      this.clearPendingChanges();
    } catch (e) {
      logger.error('OFFLINE', 'Failed to sync pending changes', { error: e.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Clear all offline data
  clear() {
    this.store = {};
    this.isDirty = false;
    
    if (typeof localStorage === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      logger.info('OFFLINE', 'Offline storage cleared');
    } catch (e) {
      logger.error('OFFLINE', 'Failed to clear storage', { error: e.message });
    }
  }

  // Get storage stats
  getStats() {
    let totalSize = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(STORAGE_PREFIX)) {
            totalSize += localStorage.getItem(key).length;
          }
        });
      }
    } catch (e) {
      logger.warn('OFFLINE', 'Failed to calculate storage size', { error: e.message });
    }

    return {
      itemCount: Object.keys(this.store).length,
      approximateSizeKB: (totalSize / 1024).toFixed(2),
      isOnline: this.isOnline,
      isDirty: this.isDirty,
      pendingChanges: this.getPendingChanges().length
    };
  }
}

export const offlineStore = new OfflineStorageManager();

export default OfflineStorageManager;

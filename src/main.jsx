import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import '@/index.css'

// Initialize all monitoring and utility services
import { logger } from '@/lib/logger'
import { perfMonitor } from '@/lib/perf-monitor'
import { healthMonitor } from '@/lib/health-monitor'
import { analytics } from '@/lib/analytics'
import { offlineStore } from '@/lib/offline-storage'
import { cacheManager } from '@/lib/cache-manager'

// Initialize services
logger.info('APP_INIT', 'Initializing application services', {
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_APP_ENV || 'development'
})

perfMonitor.mark('app_initialization_start')

// Set up performance monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    perfMonitor.mark('app_load_complete')
    perfMonitor.measure('initial_load', 'app_initialization_start', 'app_load_complete')
    logger.info('APP_PERF', 'Application loaded', {
      metrics: perfMonitor.getMetrics()
    })
  })
}

// Log analytics session start
analytics.trackEvent('app_started', {
  timestamp: Date.now(),
  userAgent: navigator.userAgent
})

// Log offline status
logger.info('APP_OFFLINE', 'Offline support initialized', {
  isOnline: offlineStore.isOnline,
  stats: offlineStore.getStats()
})

// Log cache manager initialization
logger.info('APP_CACHE', 'Cache manager initialized', {
  stats: cacheManager.getStats()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LanguageProvider>
)

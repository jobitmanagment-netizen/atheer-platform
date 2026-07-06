# 🔧 API Reference - All Services

## استخدام جميع الـ Services الجديدة

كل service متاح مباشرة عند الحاجة.

---

## 📝 Logger Service

### Import
```javascript
import { logger } from '@/lib/logger'
```

### الاستخدام
```javascript
// Log messages بمستويات مختلفة
logger.debug('CATEGORY', 'Debug message')
logger.info('CATEGORY', 'Info message', { extra: 'data' })
logger.warn('CATEGORY', 'Warning message')
logger.error('CATEGORY', 'Error message', { error: error })

// الحصول على الـ logs
const allLogs = logger.getLogs()  // Array
console.log(allLogs)

// مسح الـ logs
logger.clearLogs()

// Export
const json = logger.exportLogs('json')    // JSON
const text = logger.exportLogs('text')    // Text
```

### الـ Categories
```javascript
// استخدم categories واضحة:
logger.info('AUTH', 'Login successful')
logger.info('TRADING', 'Trade executed')
logger.info('WALLET', 'Balance updated')
logger.info('NETWORK', 'API call failed')
logger.info('PERFORMANCE', 'Slow operation detected')
```

---

## ⚠️ Error Handler

### Import
```javascript
import { ErrorHandler } from '@/lib/error-handler'
```

### الاستخدام
```javascript
try {
  // do something
} catch (error) {
  // معالجة الخطأ
  const appError = ErrorHandler.handle(error)
  
  // استخدم الـ app error
  console.log(appError.code)      // error code
  console.log(appError.message)   // user-friendly message
  console.log(appError.details)   // technical details
  
  // إظهار للمستخدم
  showError(appError.message)
  
  // تسجيل الخطأ
  logger.error(appError.code, appError.message)
}
```

### الـ Error Codes
```javascript
// Available codes:
ERROR_CODES.NETWORK_ERROR          // Network failed
ERROR_CODES.TIMEOUT_ERROR          // Request timeout
ERROR_CODES.UNAUTHORIZED           // Auth failed
ERROR_CODES.FORBIDDEN              // Access denied
ERROR_CODES.NOT_FOUND              // 404
ERROR_CODES.VALIDATION_ERROR       // Invalid data
ERROR_CODES.INSUFFICIENT_BALANCE   // Low balance
ERROR_CODES.RATE_LIMIT_EXCEEDED    // Too many requests
ERROR_CODES.SERVER_ERROR           // 5xx error
ERROR_CODES.UNKNOWN_ERROR          // Unknown
```

---

## 📊 Performance Monitor

### Import
```javascript
import { perfMonitor } from '@/lib/perf-monitor'
```

### الاستخدام
```javascript
// تتبع عملية
const startMark = perfMonitor.mark('operation_start')
// ... do something ...
perfMonitor.measure('operation', startMark)

// تتبع API call
perfMonitor.trackAPICall('GET', '/api/markets', 150, 200)
// Parameters: method, url, duration(ms), statusCode

// الحصول على الـ metrics
const metrics = perfMonitor.getMetrics()
console.log(metrics.vitals)     // Core Web Vitals
console.log(metrics.measures)   // Custom measures
console.log(metrics.apiMetrics) // API stats

// طباعة التقرير
perfMonitor.report()
```

### الـ Vitals المتتبعة
```javascript
metrics.vitals = {
  LCP: 2.5,      // Largest Contentful Paint
  CLS: 0.1,      // Cumulative Layout Shift
  FID: 50,       // First Input Delay
  FCP: 1.2,      // First Contentful Paint
  TTFB: 0.3      // Time to First Byte
}
```

---

## 💾 Cache Manager

### Import
```javascript
import { cacheManager } from '@/lib/cache-manager'
```

### الاستخدام
```javascript
// حفظ في الـ cache
cacheManager.set(
  'GET',
  '/api/markets',
  { data: [...] },
  {},
  { ttl: 5 * 60 * 1000, tags: ['markets'] }
)

// قراءة من الـ cache
const cached = cacheManager.get('GET', '/api/markets')
if (cached) {
  console.log('من الـ cache:', cached)
}

// فحص الـ cache validity
const isValid = cacheManager.isValid('GET', '/api/markets')
const isStale = cacheManager.isStale('GET', '/api/markets')

// إلغاء الـ cache
cacheManager.invalidate('GET', '/api/markets')

// إلغاء بـ tags
cacheManager.invalidateTag('markets')  // جميع الـ markets cache

// الإحصائيات
const stats = cacheManager.getStats()
console.log(stats.size)     // عدد الـ entries
console.log(stats.hitRate)  // hit percentage
```

---

## 🔄 API Interceptor

### Import
```javascript
import { APIInterceptor } from '@/lib/api-interceptor'
```

### الاستخدام
```javascript
// إنشاء interceptor مع API client
const client = new APIClient()  // your API client
const interceptor = new APIInterceptor(client)

// عمل request مع retry + caching
try {
  const data = await interceptor.request(
    'GET',
    '/api/markets',
    null,  // data
    { timeout: 5000 }  // options
  )
  
  // سيقوم بـ:
  // 1. Check cache أولاً
  // 2. إذا لم يوجد، عمل API call
  // 3. إذا فشل، retry مع exponential backoff
  // 4. حفظ في الـ cache
  // 5. تتبع الأداء
  
} catch (error) {
  const appError = ErrorHandler.handle(error)
  console.log(appError.message)
}
```

### الـ Retry Strategy
```javascript
// Automatic retry:
// - Attempt 1: immediately
// - Attempt 2: after 1 second
// - Attempt 3: after 2 seconds
// - Attempt 4: after 4 seconds (max 30s)

// Skip retry على:
// - Auth errors (401, 403)
// - Validation errors (400)
// - Not found (404)
```

---

## 🌐 Offline Storage

### Import
```javascript
import { offlineStore } from '@/lib/offline-storage'
```

### الاستخدام
```javascript
// حفظ البيانات
offlineStore.set('user_profile', {
  name: 'Ahmed',
  email: 'ahmed@example.com'
})

// قراءة البيانات
const user = offlineStore.get('user_profile')

// تحديد بيانات للـ sync (للعمليات الجديدة)
offlineStore.markDirty('user_profile')

// الحصول على البيانات المعلقة
const pendingChanges = offlineStore.getPendingChanges()
// {
//   user_profile: { name: '...', email: '...' },
//   orders: [...]
// }

// بعد الـ sync بنجاح
offlineStore.clearPendingChanges()

// الإحصائيات
const stats = offlineStore.getStats()
console.log(stats.isOnline)          // boolean
console.log(stats.isDirty)           // has pending
console.log(stats.itemCount)         // عدد الـ items
console.log(stats.approximateSizeKB) // حجم البيانات
```

---

## 📈 Analytics Service

### Import
```javascript
import { analytics } from '@/lib/analytics'
```

### الاستخدام
```javascript
// تتبع الأحداث
analytics.trackEvent('trade_executed', {
  symbol: 'BTC/USDT',
  quantity: 1.5,
  price: 45000
})

analytics.trackEvent('login', {
  method: 'google',  // or 'email'
  success: true
})

analytics.trackTrade('execute', {
  symbol: 'ETH/USDT',
  side: 'buy',
  quantity: 10,
  success: true
})

// تتبع الأخطاء
analytics.trackError('AUTH_FAILED', 'Invalid credentials', {
  email: 'user@example.com'
})

analytics.trackAPICall('GET', '/api/markets', 150, 200)

// الحصول على الـ summary
const summary = analytics.getSummary()
console.log(summary.totalEvents)   // عدد الأحداث
console.log(summary.sessionId)     // معرّف الـ session
console.log(summary.sessionDuration)  // المدة

// الحصول على الأحداث
const events = analytics.getEvents()
console.log(events)

// Export للـ backend
const batch = analytics.flush()  // إرجاع الـ batch و تنظيف
// يمكنك إرسال batch إلى backend:
// await api.post('/api/analytics', batch)

// Export كـ CSV
analytics.exportAsCSV()
```

---

## ❤️ Health Monitor

### Import
```javascript
import { healthMonitor } from '@/lib/health-monitor'
```

### الاستخدام
```javascript
// بدء المراقبة (يحدث في main.jsx افتراضياً)
healthMonitor.startMonitoring()

// الحالة الحالية
const status = healthMonitor.getStatus()
console.log(status.status)           // 'healthy', 'degraded', 'critical'
console.log(status.timestamp)        // when checked
console.log(status.checks)           // detailed checks

// السجل التاريخي
const history = healthMonitor.getHistory()
console.log(history)  // array of past statuses

// الملخص
const summary = healthMonitor.getSummary()
console.log(summary.healthyPercent)    // % healthy
console.log(summary.degradedPercent)   // % degraded
console.log(summary.criticalPercent)   // % critical

// إيقاف المراقبة
healthMonitor.stopMonitoring()
```

### الـ Health Checks
```javascript
// Automatically checked:
1. Memory usage    - warns > 75%, critical > 90%
2. Performance     - checks API response times
3. Connectivity    - checks internet connection
4. Storage         - checks localStorage availability
```

---

## 🧭 Navigation

### Import
```javascript
import { 
  navigateToLogin, 
  navigateTo,
  setGlobalNavigate 
} from '@/lib/navigation'
```

### الاستخدام
```javascript
// تسجيل الـ navigator (يحدث في App.jsx افتراضياً)
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
setGlobalNavigate(navigate)

// الانتقال إلى صفحة
navigateTo('/dashboard')

// الانتقال مع state
navigateTo('/trading', { 
  state: { symbol: 'BTC/USDT' } 
})

// الانتقال إلى صفحة التسجيل
navigateToLogin()  // يستخدم replace:true

// استخدام عام
navigateTo('/settings', { replace: true })
```

---

## Query Client (Enhanced)

### Import
```javascript
import { queryClient } from '@/lib/query-client'
```

### الاستخدام
```javascript
// استخدم مع React Query
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: () => fetch('/api/markets').then(r => r.json())
    // سيستخدم التلقائي:
    // - Smart retry (skip auth errors)
    // - Stale time: 5 minutes
    // - GC time: 10 minutes
    // - Offline fallback
  })
  
  return <div>{/* ... */}</div>
}
```

### الـ Configuration
```javascript
// تم تكويفه مع:
// - Retry strategy: exponential backoff
// - staleTime: 5 * 60 * 1000
// - gcTime: 10 * 60 * 1000
// - Global error callbacks
// - Offline support
```

---

## 🔗 Integration Pattern

### في React Component:
```javascript
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/error-handler'
import { perfMonitor } from '@/lib/perf-monitor'
import { cacheManager } from '@/lib/cache-manager'
import { analytics } from '@/lib/analytics'
import { useQuery } from '@tanstack/react-query'

export function MarketsComponent() {
  // استخدام React Query مع كل الـ optimizations
  const { data: markets, error, isLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const start = perfMonitor.mark('fetch_markets_start')
      try {
        const response = await fetch('/api/markets')
        const data = await response.json()
        
        perfMonitor.measure('fetch_markets', start)
        logger.info('MARKETS', 'Loaded', { count: data.length })
        analytics.trackEvent('markets_loaded')
        
        return data
      } catch (err) {
        const appError = ErrorHandler.handle(err)
        logger.error('MARKETS', appError.message)
        analytics.trackError('MARKETS_LOAD_FAILED', appError.message)
        throw appError
      }
    }
  })
  
  if (error) {
    return <ErrorDisplay error={error} />
  }
  
  if (isLoading) {
    return <Loading />
  }
  
  return <MarketsGrid data={markets} />
}
```

---

## ✨ Best Practices

1. **Always log important events**
   ```javascript
   logger.info('FEATURE', 'Event description', { data })
   ```

2. **Track user actions**
   ```javascript
   analytics.trackEvent('action_name', { details })
   ```

3. **Handle errors gracefully**
   ```javascript
   const appError = ErrorHandler.handle(error)
   showUserMessage(appError.message)
   ```

4. **Monitor performance**
   ```javascript
   perfMonitor.trackAPICall(method, url, duration, status)
   ```

5. **Cache expensive operations**
   ```javascript
   cacheManager.set('GET', '/api/data', data, {}, { ttl: 5*60*1000 })
   ```

6. **Test offline scenarios**
   ```javascript
   // DevTools → Network → Offline
   const data = offlineStore.get('key')
   ```

---

**Ready to build! 🚀**

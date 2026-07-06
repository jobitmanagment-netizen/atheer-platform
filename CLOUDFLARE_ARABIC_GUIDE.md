# 🚀 دليل النشر على Cloudflare
## المنصة العالمية Atheer - CCS Technology

---

## ⚠️ مشكلة الـ Login

إذا كان الـ login **لا يعمل** على Cloudflare، فغالباً المشكلة من **إعدادات البيئة**.

### الحل السريع (5 دقائق):

#### 1️⃣ جهّز القيم الأساسية
1. افتح Firebase Console وانسخ قيم المشروع.
2. تأكد من تفعيل المصادقة في Firebase.
3. احتفظ بالطبقة الخلفية المملوكة في `backend/` للوظائف الحساسة.

#### 2️⃣ أضف متغيرات البيئة في Cloudflare
1. اذهب إلى **Cloudflare Dashboard** → **Pages**
2. اختر مشروعك
3. **Settings** → **Environment Variables**
4. أضف المتغيرات التالية:

| اسم المتغير | القيمة |
|-------------|--------|
| `VITE_FIREBASE_API_KEY` | مفتاح Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | نطاق المصادقة |
| `VITE_FIREBASE_PROJECT_ID` | معرف المشروع |
| `VITE_FIREBASE_STORAGE_BUCKET` | حاوية التخزين |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | معرف الإرسال |
| `VITE_FIREBASE_APP_ID` | معرف التطبيق |
| `VITE_APP_ENV` | `production` |

#### 3️⃣ أعد النشر (Redeploy)
1. اذهب إلى **Deployments**
2. اضغط **Retry Deployment** أو **Create new deployment**

---

## 📁 الملفات المطلوبة

### ✅ تم إنشاء هذه الملفات:

1. **`public/_redirects`** - ضروري لـ SPA routing
2. **`public/_routes.json`** - إعدادات Cloudflare
3. **`.env.example`** - مثال لمتغيرات البيئة
4. **`CLOUDFLARE_DEPLOY.md`** - دليل النشر الكامل

---

## 🔍 التحقق من المشاكل

### 1. افحص المتصفح (Console)

```
❌ Error: Firebase config missing
✅ الحل: أضف قيم Firebase في Cloudflare

❌ 404 Not Found
✅ الحل: تأكد من وجود public/_redirects

❌ Network Error
✅ الحل: تحقق من إعدادات Firebase و CORS
```

### 2. اختبر محلياً أولاً
```bash
# انسخ ملف المثال
cp .env.example .env.local

# عدل القيم في .env.local

# شغّل محلياً
npm run dev
```

### 3. بناء واختبار محلياً
```bash
# بناء
npm run build

# اختبار محلي
npm run preview

# لو اشتغل، انشر على Cloudflare
npm run deploy:cloudflare
```

---

## 🛠️ الأخطاء الشائعة

### ❌ "Authentication Required"
**السبب:** متغيرات البيئة ناقصة  
**الحل:** أضف جميع المتغيرات في Cloudflare Dashboard

### ❌ صفحة بيضاء (White Screen)
**الحل:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ 404 عند عمل Refresh
**السبب:** ملف `_redirects` مفقود  
**الحل:** تأكد من وجود `public/_redirects` بالمحتوى التالي:
```
/*    /index.html   200
```

### ❌ الـ Login ينجح لكن الصفحة لا تحمل
**السبب:** مشكلة في الـ routing  
**الحل:** تأكد من وجود `public/_routes.json`:
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
```

---

## 📊 قائمة التحقق قبل النشر

- [ ] متغيرات البيئة مضبوطة في Cloudflare
- [ ] ملف `public/_redirects` موجود
- [ ] ملف `public/_routes.json` موجود
- [ ] اختبرت محلياً (`npm run dev`)
- [ ] البناء نجح (`npm run build`)
- [ ] الـ Login يعمل محلياً
- [ ] جميع الصفحات تعمل محلياً

---

## 🔗 روابط مفيدة

- **دليل النشر الكامل:** `CLOUDFLARE_DEPLOY.md`
- **مثال البيئة:** `.env.example`
- **دليل Azure:** `AZURE_DEPLOY.md` (بديل)

---

## 📞 الدعم

**المطور:** جهاد أحمد عبيد  
**الشركة:** CCS Technology  
**المنصة:** Atheer Global

للدعم الفني:
1. تحقق من Console المتصفح
2. تأكد من متغيرات البيئة
3. راجع سجلات النشر في Cloudflare
4. اختبر محلياً أولاً

---

*© 2026 المنصة العالمية Atheer — تطوير CCS Technology*

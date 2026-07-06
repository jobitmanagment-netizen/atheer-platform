# 📧 Cloudflare Email Setup — CCS Technology

إعداد صناديق البريد الاحترافية على النطاق `ccs-technology.com` وتحويلها إلى Gmail.
Set up professional mailboxes on `ccs-technology.com` and forward them to Gmail.

> يوجد دليل مطابق بصيغة أخرى في `CLOUDFLARE_EMAIL_ROUTING.md`. هذا الملف هو المرجع الرسمي ويضيف سجلّات **DKIM**.
> A companion guide exists at `CLOUDFLARE_EMAIL_ROUTING.md`. This file is the canonical reference and adds **DKIM** records.

---

## 🎯 المطلوب / Goal

| العنوان / Address | الغرض / Purpose | يُحوّل إلى / Forwards to |
|---|---|---|
| `info@ccs-technology.com` | التواصل العام / General | `job.it.managment@gmail.com` |
| `atheer@ccs-technology.com` | منصة أثير / Atheer platform | `job.it.managment@gmail.com` |
| `job.it.managment@ccs-technology.com` | الإدارة التقنية / Technical | `job.it.managment@gmail.com` |

> Cloudflare Email Routing **مجاني** ويعمل للاستقبال/التحويل فقط. للإرسال من عنوان `@ccs-technology.com` استخدم "Send mail as" في Gmail عبر SMTP relay.
> Cloudflare Email Routing is **free** and handles inbound forwarding only. To *send* from `@ccs-technology.com`, configure Gmail "Send mail as" with an SMTP relay.

---

## ✅ الطريقة الأولى: لوحة تحكم Cloudflare / Dashboard (الأسهل)

1. **Cloudflare Dashboard** → اختر النطاق `ccs-technology.com`.
2. من القائمة الجانبية: **Email → Email Routing**.
3. اضغط **Get started / Enable Email Routing**. سيضيف Cloudflare سجلات DNS المطلوبة تلقائياً (MX + SPF). وافق عليها.
4. **Destination addresses** → أضف `job.it.managment@gmail.com` ثم افتح رسالة التحقق في Gmail وأكّدها.
5. **Routing rules → Custom addresses** → أضف كل عنوان:
   - `info` → Send to → `job.it.managment@gmail.com`
   - `atheer` → Send to → `job.it.managment@gmail.com`
   - `job.it.managment` → Send to → `job.it.managment@gmail.com`
6. (اختياري) فعّل **Catch-all** لتحويل أي عنوان آخر إلى نفس الوجهة.

---

## ⚙️ الطريقة الثانية: عبر Cloudflare API

استبدل `ZONE_ID` و `API_TOKEN` (صلاحية *Email Routing Rules: Edit*).

```bash
export CF_ZONE_ID="<ZONE_ID>"
export CF_API_TOKEN="<API_TOKEN>"
export DEST="job.it.managment@gmail.com"

# 1) تفعيل Email Routing
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/email/routing/enable" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json"

# 2) إضافة عنوان الوجهة (سيصل بريد تحقق إلى Gmail — افتحه وأكّد)
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/email/routing/addresses" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  --data "{\"email\":\"$DEST\"}"

# 3) إنشاء قاعدة تحويل لكل عنوان
for USER in info atheer job.it.managment; do
  curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/email/routing/rules" \
    -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
    --data "{
      \"name\": \"forward-$USER\",
      \"enabled\": true,
      \"matchers\": [{\"type\":\"literal\",\"field\":\"to\",\"value\":\"$USER@ccs-technology.com\"}],
      \"actions\":  [{\"type\":\"forward\",\"value\":[\"$DEST\"]}]
    }"
done
```

---

## 🌐 سجلات DNS المطلوبة / Required DNS records

### 1) MX — استقبال البريد (يضيفها Cloudflare تلقائياً)

```
MX   ccs-technology.com   route1.mx.cloudflare.net   (priority 22)
MX   ccs-technology.com   route2.mx.cloudflare.net   (priority 62)
MX   ccs-technology.com   route3.mx.cloudflare.net   (priority 84)
```

### 2) SPF — TXT (تفويض مرسلي Cloudflare)

```
TXT  ccs-technology.com   "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

> إن كان لديك سجل SPF سابق، ادمج `include:_spf.mx.cloudflare.net` في سجل SPF **واحد** فقط.
> If an SPF record already exists, merge `include:_spf.mx.cloudflare.net` into a **single** SPF record.

### 3) DKIM — TXT (توقيع الرسائل)

Cloudflare Email Routing يوقّع الرسائل الصادرة عبر بنيته؛ التوقيع مُدار من Cloudflare. عند تفعيل **Send mail as** من Gmail/Google Workspace، أضف سجل DKIM الذي يوفّره مزوّد الإرسال:

```
TXT  google._domainkey.ccs-technology.com   "v=DKIM1; k=rsa; p=<PUBLIC_KEY_FROM_PROVIDER>"
```

> استبدل `<PUBLIC_KEY_FROM_PROVIDER>` بالمفتاح العام الذي يُنشئه مزوّد SMTP (Google Workspace → Apps → Gmail → Authenticate email؛ أو Zoho/Cloudflare Email Workers). المُحدِّد (selector) قد يختلف (`google`, `default`, `zoho`, …).

### 4) DMARC — TXT (سياسة المصادقة، موصى به)

```
TXT  _dmarc.ccs-technology.com   "v=DMARC1; p=quarantine; rua=mailto:job.it.managment@gmail.com; adkim=s; aspf=s"
```

---

## 🔎 التحقق / Verify

```bash
dig +short MX ccs-technology.com
dig +short TXT ccs-technology.com
dig +short TXT google._domainkey.ccs-technology.com
dig +short TXT _dmarc.ccs-technology.com
```

ثم أرسل بريداً تجريبياً إلى `info@ccs-technology.com` وتأكد من وصوله إلى `job.it.managment@gmail.com`.
Then send a test email to `info@ccs-technology.com` and confirm it lands in `job.it.managment@gmail.com`.

# 🌩️ Cloudflare Pages Deployment Guide
## CCS Technology - Atheer Global Platform

---

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Get Your App Credentials
1. Open Firebase Console and copy your Firebase config values.
2. Keep the owned backend folder (`backend/`) for server-side logic.
3. No vendor dashboard is required for the frontend build.

### Step 2: Configure Environment Variables
In Cloudflare Pages dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add these variables:

| Variable Name | Value |
|---------------|-------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender id |
| `VITE_FIREBASE_APP_ID` | Firebase app id |
| `VITE_APP_ENV` | `production` |

### Step 3: Deploy to Cloudflare

#### Option A: Direct Upload (Easiest)
```bash
# 1. Build the project
npm run build

# 2. Install Wrangler CLI
npm install -g wrangler

# 3. Login to Cloudflare
wrangler login

# 4. Deploy
wrangler pages deploy ./dist --project-name=atheer-global
```

#### Option B: Git Integration (Recommended)
1. Push your code to GitHub
2. In Cloudflare Dashboard:
   - Go to **Pages** → **Create a project**
   - Connect your GitHub repository
   - Set build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - Add environment variables (from Step 2)
   - Click **Deploy**

---

## 🔧 Configuration Files

### `_redirects` (Required for SPA)
Located in `public/_redirects`:
```
/*    /index.html   200
```
This ensures all routes serve the React app (not 404s).

### `_routes.json` (Optional)
Located in `public/_routes.json`:
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Login Not Working
**Problem:** Redirects to login but doesn't authenticate

**Solution:**
1. Verify Firebase environment variables are set correctly in Cloudflare
2. Clear browser cache and cookies
3. Check browser console for errors

### Issue 2: 404 on Page Refresh
**Problem:** Pages work on navigation but 404 on refresh

**Solution:**
- Ensure `public/_redirects` file exists with correct content
- Redeploy after adding the file

### Issue 3: "App ID Required" Error
**Problem:** App loads but shows authentication errors

**Solution:**
```bash
# Check if env vars are set
wrangler pages deployment list

# Re-deploy with correct vars
wrangler pages deploy ./dist --project-name=atheer-global
```

### Issue 4: Build Fails
**Problem:** `npm run build` fails

**Solution:**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📊 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Login/Register pages accessible
- [ ] Can authenticate successfully
- [ ] All routes work (Dashboard, Wallets, Swap, etc.)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Custom domain configured (optional)

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Use Cloudflare environment variables
2. **Enable Cloudflare security headers** - Already configured in `staticwebapp.config.json`
3. **Use HTTPS only** - Automatic with Cloudflare
4. **Enable DDoS protection** - In Cloudflare dashboard
5. **Set up custom domain** - For production branding

---

## 📞 Support

**Developer:** Jihad Ahmad Obeid  
**Company:** CCS Technology  
**Platform:** Atheer Global  

For technical support:
1. Check browser console for errors
2. Verify environment variables
3. Review Cloudflare deployment logs
4. Test locally first (`npm run dev`)

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | ✅ Yes | Firebase API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ Yes | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ Yes | Firebase project id | `my-project` |
| `VITE_APP_ENV` | ✅ Yes | Environment name | `production` |

---

## 🎯 Production Tips

1. **Enable Analytics** - Track user behavior in Cloudflare
2. **Set up Custom Domain** - Professional branding
3. **Configure Caching** - Improve load times
4. **Monitor Performance** - Use Cloudflare Analytics
5. **Enable Auto-Deploy** - Git integration for CI/CD

---

*© 2026 ATHEER Global Platform — Developed by CCS Technology*
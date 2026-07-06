# ⚡ ATHEER GLOBAL PLATFORM — Production Ready Code Package
## Developed by CCS Technology | General Manager: Jihad Ahmad Obeid

---

## 📦 HOW TO GET THE FULL CODE ON YOUR DESKTOP

### Method 1: Export from Code Export Page (In-App)
1. Log in to the platform as admin
2. Navigate to **Code Export** page in the sidebar
3. Download `package.json`, `README.md`, `setup.sh`, `docker-compose.yml`, and `.env.example`
4. Copy your full source code from the repository
5. Open terminal in the project folder
6. Run: `npm install && npm run dev`

### Method 2: Clone via Git (if GitHub sync is enabled)
```bash
cd ~/Desktop
git clone YOUR_REPO_URL atheer-global-platform
cd atheer-global-platform
npm install
npm run dev
```

---

## 🗂️ COMPLETE FILE STRUCTURE (All Files)

```
atheer-global-platform/
│
├── 📄 index.html                          ← Main HTML entry
├── 📄 index.css                           ← Design tokens + animations
├── 📄 tailwind.config.js                  ← Tailwind theme
├── 📄 App.jsx                             ← Router + Auth
├── 📄 main.jsx                            ← React entry point
│
├── 📁 pages/
│   ├── Landing.jsx                        ← Public landing (CCS Technology info)
│   ├── Dashboard.jsx                      ← Main dashboard + analytics
│   ├── Wallets.jsx                        ← Multi-chain wallet management
│   ├── Swap.jsx                           ← AI-risk token swap
│   ├── Liquidity.jsx                      ← DeFi liquidity pools
│   ├── History.jsx                        ← Transaction history + export
│   ├── Profile.jsx                        ← User profile + KYC
│   ├── Admin.jsx                          ← ✅ Admin panel (ENHANCED)
│   ├── Login.jsx                          ← Auth login
│   ├── Register.jsx                       ← Auth register
│   ├── ForgotPassword.jsx                 ← Auth forgot password
│   └── ResetPassword.jsx                  ← Auth reset password
│
├── 📁 components/
│   ├── 📁 atheer/
│   │   ├── AppLayout.jsx                  ← Main layout wrapper
│   │   ├── AppSidebar.jsx                 ← Desktop sidebar nav
│   │   ├── TopBar.jsx                     ← Top header
│   │   ├── MobileNav.jsx                  ← Mobile bottom nav
│   │   ├── PriceTicker.jsx                ← Live price ticker bar
│   │   ├── LivePriceWidget.jsx            ← Price widget card
│   │   ├── RiskBadge.jsx                  ← Risk level badge
│   │   ├── ChainBadge.jsx                 ← Blockchain badge
│   │   ├── StatCard.jsx                   ← KPI card
│   │   └── NotificationCenter.jsx        ← ✅ SMART ALERTS (LIVE)
│   │
│   ├── 📁 admin/
│   │   ├── AdminStatsPanel.jsx            ← ✅ ADVANCED STATISTICS PANEL
│   │   └── ReportExporter.jsx             ← ✅ REPORT EXPORT (CSV + JSON)
│   │
│   ├── ProtectedRoute.jsx
│   ├── ScrollToTop.jsx
│   └── UserNotRegisteredError.jsx
│
├── 📁 ccs/
│   ├── 📁 entities/
│   ├── UserProfile.json                   ← User profile schema
│   ├── Wallet.json                        ← Wallet schema
│   ├── SwapOrder.json                     ← Swap order schema
│   ├── LiquiditySession.json              ← Liquidity pool session
│   └── AuditLog.json                      ← Audit trail
│
├── 📁 lib/
│   ├── ai-risk-engine.js                  ← AI fraud detection
│   ├── atheer-constants.js                ← Platform constants
│   ├── AuthContext.jsx                    ← Auth context
│   ├── query-client.js                    ← React Query client
│   └── utils.js                           ← Utility functions
│
├── 📁 api/
│   └── apiClient.js                       ← CCS Technology SDK client
│
├── 📁 .github/workflows/
│   └── azure-deploy.yml                   ← CI/CD auto-deploy
│
├── 📄 Dockerfile                          ← Docker container
├── 📄 nginx.conf                          ← Nginx config
├── 📄 staticwebapp.config.json            ← Azure SPA routing
├── 📄 deploy-azure.sh                     ← One-click Azure deploy
├── 📄 AZURE_DEPLOY.md                     ← Azure deployment guide
└── 📄 README.md                           ← Full documentation
```

---

## ✅ NEW FEATURES ADDED IN THIS SESSION

### 1. 🔔 Smart Alerts (NotificationCenter.jsx)
- **Live real-time alerts** from database using `SwapOrder.subscribe()`
- Automatically detects HIGH/CRITICAL risk transactions and creates alerts
- Color-coded by severity (red for CRITICAL, orange for HIGH)
- Live badge "● LIVE" indicator
- Auto-refresh every 60 seconds
- Unread count badge with pulse animation

### 2. 📊 Advanced Statistics Panel (AdminStatsPanel.jsx)
- **7-Day Volume Area Chart** — daily transaction volume trend
- **Risk Distribution Bar Chart** — color-coded by risk level
- **Volume by Chain Bar Chart** — horizontal bars per blockchain
- **KYC Status Pie Chart** — verified/pending/none breakdown
- KPI cards with trend indicators (↑↓)

### 3. 📥 Report Exporter (ReportExporter.jsx)
| Report | Format | Records |
|--------|--------|---------|
| Swap Transactions | CSV + JSON | All swaps |
| Users Report | CSV + JSON | All users |
| Audit Log | CSV + JSON | All logs |
| Risk Summary | CSV + JSON | HIGH+CRITICAL only |

---

## 🚀 PRODUCTION DEPLOYMENT COMMANDS

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Test locally
npx serve dist

# 4. Deploy to Azure (one command)
chmod +x deploy-azure.sh && ./deploy-azure.sh
```

---

## 🏢 COMPANY INFORMATION

| Field | Value |
|-------|-------|
| Company | CCS Technology |
| Address | North Lebanon, Tripoli |
| Phone | +961 03 429 802 |
| Email | job.it.managment@gmail.com |
| General Manager | Jihad Ahmad Obeid |
| Platform | ATHEER GLOBAL |

---

*© 2026 ATHEER Global Platform — Developed by CCS Technology*
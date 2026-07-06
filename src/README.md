# ⚡ ATHEER GLOBAL PLATFORM

> **Enterprise-Grade Multi-Chain Web3 Liquidity & Exchange Platform**  
> AI-Powered Risk Detection · USDT TRC20 · ETH · BNB · Polygon · Tron

---

## 🚀 Quick Start

```bash
# Install
npm install

# Development
npm run dev

# Production Build
npm run build

# Preview build locally
npx serve dist
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Custom Design System |
| State | @tanstack/react-query |
| Charts | Recharts |
| Auth / DB / Realtime | CCS Technology SDK Platform |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Icons | Lucide React |

---

## 📁 Project Structure

```
ccs-technology-atheer/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx        # Public landing page
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── Wallets.jsx        # Multi-chain wallet management
│   │   ├── Swap.jsx           # AI-powered token swap
│   │   ├── Liquidity.jsx      # Liquidity pool management
│   │   ├── History.jsx        # Transaction history
│   │   ├── Profile.jsx        # User profile + KYC
│   │   └── Admin.jsx          # Admin panel
│   │
│   ├── components/
│   │   └── ccs/
│   │       ├── AppLayout.jsx      # Main layout wrapper
│   │       ├── AppSidebar.jsx     # Desktop navigation
│   │       ├── TopBar.jsx         # Top header + notifications
│   │       ├── MobileNav.jsx      # Bottom mobile nav
│   │       ├── PriceTicker.jsx    # Live price ticker
│   │       ├── LivePriceWidget.jsx # Price widget sidebar
│   │       ├── RiskBadge.jsx      # AI risk level badge
│   │       ├── ChainBadge.jsx     # Blockchain network badge
│   │       ├── StatCard.jsx       # KPI stat card
│   │       └── NotificationCenter.jsx  # Notifications
│   │
│   ├── lib/
│   │   ├── ai-risk-engine.js  # AI fraud detection logic
│   │   └── ccs-constants.js # Platform constants & prices
│   │
│   └── entities/              # Database schemas
│       ├── UserProfile.json
│       ├── Wallet.json
│       ├── SwapOrder.json
│       ├── LiquiditySession.json
│       └── AuditLog.json
│
├── staticwebapp.config.json   # Azure SPA routing config
├── Dockerfile                 # Docker container (App Service)
├── nginx.conf                 # Nginx config for Docker
├── deploy-azure.sh            # One-click deployment script
├── AZURE_DEPLOY.md            # Detailed Azure deployment guide
└── .github/workflows/
    └── azure-deploy.yml       # GitHub Actions CI/CD
```

---

## 🌐 Azure Deployment

### Fastest Method (< 5 minutes)
```bash
# Make script executable
chmod +x deploy-azure.sh

# Run deployment
./deploy-azure.sh
```

### Manual Method
```bash
# Build
npm run build

# Deploy via Azure CLI
az staticwebapp create \
  --name atheer-global \
  --resource-group atheer-rg \
  --location eastus \
  --sku Free

swa deploy ./dist --env production
```

See **AZURE_DEPLOY.md** for full documentation including:
- GitHub Actions CI/CD setup
- Custom domain configuration
- Docker + App Service deployment
- Azure CDN + Blob Storage option
- Cost comparison table

---

## 🔐 Supported Networks

| Network | Chain ID | Token | Special |
|---------|----------|-------|---------|
| Ethereum | ETH | ETH, USDT | Primary |
| BNB Chain | BNB | BNB, USDT | High throughput |
| Polygon | POLY | MATIC, USDT | Low fee L2 |
| Tron | TRON | TRX, USDT-TRC20 | Ultra-low fees |

---

## 🤖 AI Risk Engine

The platform uses a proprietary AI risk scoring system (0-100):

| Score | Level | Action |
|-------|-------|--------|
| 0-19 | SAFE | Auto-approve |
| 20-39 | LOW | Monitor |
| 40-59 | MEDIUM | Enhanced KYC check |
| 60-79 | HIGH | Manual review recommended |
| 80-100 | CRITICAL | Block + alert admin |

Risk factors analyzed:
- Transaction amount (USD threshold)
- Trading velocity (swaps per minute)  
- Wallet age (new wallet detection)
- Chain-specific risks (TRON elevated)
- Account age

---

## 📊 Platform Features

- ✅ Multi-chain token swaps with AI risk analysis
- ✅ Institutional wallet management (create/import)
- ✅ USDT TRC20 dedicated support
- ✅ Liquidity pools with live APY tracking
- ✅ Complete audit log system
- ✅ KYC workflow (none → pending → verified)
- ✅ Admin panel with risk monitoring
- ✅ CSV export for compliance
- ✅ Real-time price ticker
- ✅ Notification center
- ✅ Mobile-responsive with bottom nav
- ✅ Dark mode (Binance-inspired design)

---

## 📄 License

Proprietary — ATHEER GLOBAL PLATFORM © 2026  
Developed by CCS Technology  
Developer: Jihad Ahmad Obeid
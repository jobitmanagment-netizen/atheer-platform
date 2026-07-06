import { useState } from 'react';
import { Download, FileText, Package, Code2, CheckCircle, Copy, Folder, File } from 'lucide-react';

// ── Project file tree (for display) ──────────────────────
const FILE_TREE = [
  { type: 'folder', name: 'src/', children: [
    { type: 'folder', name: 'pages/', children: [
      'Landing.jsx', 'Dashboard.jsx', 'Swap.jsx', 'Wallets.jsx',
      'Liquidity.jsx', 'History.jsx', 'Profile.jsx', 'Admin.jsx',
      'Analytics.jsx', 'SecurityCenter.jsx', 'SecurityAlerts.jsx',
      'ThreatReports.jsx', 'AIModelsHub.jsx', 'RiskTrends.jsx',
      'Login.jsx', 'Register.jsx', 'ForgotPassword.jsx', 'ResetPassword.jsx', 'CodeExport.jsx',
    ]},
    { type: 'folder', name: 'components/', children: [
      { type: 'folder', name: 'atheer/', children: ['AppLayout.jsx','AppSidebar.jsx','TopBar.jsx','MobileNav.jsx','PriceTicker.jsx','NotificationCenter.jsx','ChainBadge.jsx','RiskBadge.jsx','StatCard.jsx','LivePriceWidget.jsx','SelectSheet.jsx'] },
      { type: 'folder', name: 'security/', children: ['AIThreatMonitor.jsx'] },
      { type: 'folder', name: 'admin/',  children: ['AdminStatsPanel.jsx','ReportExporter.jsx'] },
      { type: 'folder', name: 'ui/',     children: ['(shadcn components)'] },
    ]},
    { type: 'folder', name: 'lib/',     children: ['atheer-constants.js','ai-risk-engine.js','AuthContext.jsx','query-client.js','utils.js','PageNotFound.jsx'] },
    { type: 'folder', name: 'api/',     children: ['ccsClient.js'] },
    'App.jsx', 'main.jsx', 'index.css',
  ]},
  { type: 'folder', name: 'backend/', children: [
    { type: 'folder', name: 'entities/', children: ['UserProfile.jsonc','SwapOrder.jsonc','Wallet.jsonc','LiquiditySession.jsonc','AuditLog.jsonc','ThreatAlert.jsonc'] },
    { type: 'folder', name: 'functions/', children: ['generateThreatAlerts/entry.ts'] },
  ]},
  'tailwind.config.js', 'index.html', 'Dockerfile', 'nginx.conf',
  '.github/workflows/azure-deploy.yml', 'staticwebapp.config.json',
];

// ── Package.json representation ───────────────────────────
const PKG_JSON = {
  name: "atheer-global-platform",
  version: "2.0.0",
  description: "Enterprise AI-Powered Multi-Chain DeFi Platform with Automated Threat Detection",
  private: true,
  type: "module",
  scripts: { dev: "vite", build: "vite build", preview: "vite preview", lint: "eslint . --quiet" },
  dependencies: {
    "react": "^18.2.0", "react-dom": "^18.2.0",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.84.1",
    "recharts": "^2.15.4",
    "framer-motion": "^11.16.4",
    "lucide-react": "^0.475.0",
    "tailwindcss": "^3.4.17", "tailwindcss-animate": "^1.0.7",
    "date-fns": "^3.6.0", "lodash": "^4.17.21",
    "react-markdown": "^9.0.1",
    "react-hook-form": "^7.54.2",
    "react-quill": "^2.0.0",
    "react-leaflet": "^4.2.1",
    "@hello-pangea/dnd": "^17.0.0",
    "vaul": "^1.1.2",
    "three": "^0.171.0",
    "jspdf": "^4.2.1",
    "html2canvas": "^1.4.1",
    "canvas-confetti": "^1.9.4",
    "clsx": "^2.1.1", "tailwind-merge": "^3.0.2",
    "class-variance-authority": "^0.7.1",
    "sonner": "^2.0.1", "moment": "^2.30.1",
  }
};

// ── README content ─────────────────────────────────────────
const README = `# ATHEER GLOBAL PLATFORM 🌐
## Enterprise AI-Powered Multi-Chain DeFi Platform v2.0

### 🚀 Core Features
- ✅ Multi-chain swap engine (ETH, BNB, POLY, TRC20) with order book
- ✅ AI Risk Engine — real-time risk scoring (0-100) per transaction
- ✅ Automated Threat Alert System — scheduled scans every 15 minutes
- ✅ AI Threat Detection Monitor (admin-only) with live neural analysis
- ✅ Risk Trends Analytics — 14-day visualization with exportable reports
- ✅ Security Center — SHA-256, HMAC-SHA256, hash verifier, audit trail
- ✅ Smart Notifications — live alerts with WebSocket subscriptions
- ✅ Admin Dashboard — advanced statistics & charts (recharts)
- ✅ Analytics Dashboard — KPIs, trader leaderboard, volume charts
- ✅ Report Exporter — CSV/JSON/TXT with full risk analytics
- ✅ KYC Management System (none → pending → verified)
- ✅ Wallet Portfolio Manager (create/import, multi-chain)
- ✅ Liquidity Pool Manager with live APY tracking
- ✅ Audit Log System with SHA-256 integrity hashing
- ✅ AI Models Hub — deployed security models dashboard
- ✅ Binance-style UI (dark theme, order book, price ticker)
- ✅ Mobile-responsive with safe-area support + bottom-sheet selects
- ✅ Docker + Azure Static Web Apps deployment ready

### 📦 Tech Stack
- React 18 + Vite 6
- TailwindCSS + shadcn/ui
- Recharts (data viz)
- @tanstack/react-query
- CCS Technology SDK (auth + DB + realtime + AI)
- Framer Motion + Three.js
- React Router v6

### 🏗️ Architecture
\`\`\`
Frontend: React + Vite (Docker / Azure Static Web Apps)
Backend:  CCS Technology SDK Platform (Auth, Database, Realtime, AI, Functions)
Security: SHA-256 / HMAC-SHA256 / AI Threat Detection
\`\`\`

### ⚙️ Setup
1. Clone / unzip the project
2. \`npm install\`
3. \`npm run dev\`  →  http://localhost:5173

### 🚢 Deploy
- Docker: \`docker build -t atheer-platform . && docker run -p 80:80 atheer-platform\`
- Azure:  \`chmod +x deploy-azure.sh && ./deploy-azure.sh\`
- Manual: \`npm run build && npx serve dist\`

### 🔐 Security
- Automated threat scanning (every 15 min)
- AI confidence scoring per alert
- 5 detection patterns: high-risk swaps, velocity spikes, large volume AML, failed TX clusters, critical audit events
- Auto-resolve stale alerts after 24h

---
Built with ❤️ by CCS Technology | Developer: Jihad Ahmad Obeid | ATHEER Global Platform © ${new Date().getFullYear()}
`;

function FileNode({ item, depth = 0 }) {
  const pad = depth * 14;
  if (typeof item === 'string') {
    const ext = item.split('.').pop();
    const colors = { jsx: '#61DAFB', js: '#F7DF1E', json: '#03A66D', css: '#264de4', md: '#F0B90B', yml: '#CF304A', html: '#E34F26' };
    return (
      <div className="flex items-center gap-2 py-0.5 hover:opacity-80 text-xs" style={{ paddingLeft: 16 + pad, color: '#848E9C' }}>
        <File className="w-3 h-3 flex-shrink-0" style={{ color: colors[ext] || '#4B5563' }} />
        <span>{item}</span>
      </div>
    );
  }
  if (item.type === 'folder') {
    return (
      <div>
        <div className="flex items-center gap-2 py-0.5 text-xs font-semibold" style={{ paddingLeft: 16 + pad, color: '#F0B90B' }}>
          <Folder className="w-3 h-3" />
          <span>{item.name}</span>
        </div>
        {(item.children || []).map((child, i) => <FileNode key={i} item={child} depth={depth + 1} />)}
      </div>
    );
  }
  return null;
}

export default function CodeExport() {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const downloadFile = (content, filename, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPackageJson = () => downloadFile(JSON.stringify(PKG_JSON, null, 2), 'package.json', 'application/json');
  const downloadReadme      = () => downloadFile(README, 'README.md');
  const downloadSetupScript = () => {
    const script = `#!/bin/bash
# ATHEER Global Platform — Quick Setup
echo "🚀 Setting up ATHEER Global Platform..."
npm install
echo "✅ Dependencies installed!"
echo ""
echo "🔧 Start development server:"
echo "  npm run dev"
echo ""
echo "🚢 Build for production:"
echo "  npm run build"
echo ""
echo "📦 Deploy to Azure:"
echo "  See AZURE_DEPLOY.md for instructions"
echo ""
echo "ATHEER Platform ready! 🌐"
`;
    downloadFile(script, 'setup.sh');
  };

  const downloadDockerCompose = () => {
    const dc = `version: '3.8'
services:
  atheer-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;
    downloadFile(dc, 'docker-compose.yml');
  };

  const downloadEnvExample = () => {
    const env = `# ATHEER Global Platform — Environment Variables
# Copy this file to .env.local and fill in your values

# CCS Technology Platform (required)
VITE_APP_ID=your_app_id_here

# Optional: Analytics
VITE_ANALYTICS_ID=

# Optional: Custom API endpoint
VITE_API_BASE_URL=https://api.yourplatform.com

# Build settings
NODE_ENV=production
`;
    downloadFile(env, '.env.example');
  };

  const DOWNLOADS = [
    { label: 'package.json',       desc: 'قائمة التبعيات والأوامر',        color: '#03A66D', icon: Package,  fn: downloadPackageJson    },
    { label: 'README.md',          desc: 'توثيق المشروع الكامل',            color: '#F0B90B', icon: FileText, fn: downloadReadme         },
    { label: 'setup.sh',           desc: 'سكريبت الإعداد السريع',           color: '#627EEA', icon: Code2,   fn: downloadSetupScript    },
    { label: 'docker-compose.yml', desc: 'إعداد Docker Compose',            color: '#1890FF', icon: Package, fn: downloadDockerCompose  },
    { label: '.env.example',       desc: 'متغيرات البيئة المطلوبة',          color: '#8247E5', icon: FileText, fn: downloadEnvExample    },
  ];

  const QUICK_COMMANDS = [
    { label: 'تثبيت التبعيات',  cmd: 'npm install',                                    color: '#03A66D' },
    { label: 'تشغيل التطوير',   cmd: 'npm run dev',                                    color: '#F0B90B' },
    { label: 'بناء الإنتاج',    cmd: 'npm run build',                                  color: '#627EEA' },
    { label: 'Docker Build',     cmd: 'docker build -t atheer-platform .',              color: '#1890FF' },
    { label: 'Docker Run',       cmd: 'docker run -p 80:80 atheer-platform',            color: '#8247E5' },
    { label: 'Azure Deploy',     cmd: 'az staticwebapp create --name atheer-platform',  color: '#CF304A' },
  ];

  return (
    <div className="p-6 space-y-6" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>تصدير الكود المصدري</h1>
          <p className="text-sm mt-1" style={{ color: '#848E9C' }}>تنزيل ملفات الإعداد والتوثيق لنشر المنصة</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)' }}>
          <Code2 className="w-4 h-4" style={{ color: '#F0B90B' }} />
          <span className="text-sm font-bold" style={{ color: '#F0B90B' }}>ATHEER v2.0.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* File Tree */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
            <Folder className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>هيكل المشروع</span>
          </div>
          <div className="p-3 overflow-y-auto" style={{ maxHeight: 400, fontFamily: 'var(--font-mono)' }}>
            {FILE_TREE.map((item, i) => <FileNode key={i} item={item} />)}
          </div>
        </div>

        {/* Downloads + Commands */}
        <div className="lg:col-span-2 space-y-5">

          {/* Download Files */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
              <Download className="w-4 h-4" style={{ color: '#F0B90B' }} />
              <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>تنزيل ملفات الإعداد</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOWNLOADS.map(d => (
                <button key={d.label} onClick={d.fn}
                        className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-80 active:scale-95"
                        style={{ background: '#0B0E11', border: `1px solid ${d.color}25` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${d.color}12` }}>
                    <d.icon className="w-4 h-4" style={{ color: d.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#EAECEF' }}>{d.label}</p>
                    <p className="text-xs" style={{ color: '#4B5563' }}>{d.desc}</p>
                  </div>
                  <Download className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: d.color }} />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Commands */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
              <Code2 className="w-4 h-4" style={{ color: '#F0B90B' }} />
              <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>أوامر التثبيت والنشر</span>
            </div>
            <div className="p-4 space-y-2">
              {QUICK_COMMANDS.map(c => (
                <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #1A1F26' }}>
                  <span className="text-xs font-semibold w-28 flex-shrink-0" style={{ color: c.color }}>{c.label}</span>
                  <code className="flex-1 text-xs font-mono truncate" style={{ color: '#EAECEF' }}>{c.cmd}</code>
                  <button onClick={() => copyToClipboard(c.cmd, c.label)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80"
                          style={{ background: copied === c.label ? 'rgba(3,166,109,0.12)' : 'rgba(240,185,11,0.08)', color: copied === c.label ? '#03A66D' : '#F0B90B' }}>
                    {copied === c.label ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === c.label ? 'تم!' : 'نسخ'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="rounded-2xl p-5" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>التقنيات المستخدمة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { name: 'React 18',         color: '#61DAFB' },
                { name: 'Vite',             color: '#646CFF' },
                { name: 'TailwindCSS',      color: '#38BDF8' },
                { name: 'shadcn/ui',        color: '#EAECEF' },
                { name: 'Recharts',         color: '#22B5BF' },
                { name: 'Framer Motion',    color: '#FF0055' },
                { name: 'React Query',      color: '#FF4154' },
                { name: 'CCS Technology SDK',color: '#F0B90B' },
                { name: 'React Router v6',  color: '#CA4245' },
                { name: 'Docker',           color: '#1890FF' },
                { name: 'Azure SWA',        color: '#0078D4' },
                { name: 'Nginx',            color: '#03A66D' },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                     style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="font-semibold" style={{ color: '#EAECEF' }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* README Preview */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>README.md — معاينة</span>
          </div>
          <button onClick={downloadReadme}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
            <Download className="w-3 h-3" />
            تنزيل
          </button>
        </div>
        <pre className="p-5 text-xs overflow-x-auto" style={{ color: '#848E9C', fontFamily: 'var(--font-mono)', lineHeight: 1.7, maxHeight: 300, background: '#0D1117', whiteSpace: 'pre-wrap' }}>
          {README}
        </pre>
      </div>
    </div>
  );
}
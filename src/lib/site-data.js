// CCS Technology — corporate site content.
// Bilingual fields carry { ar, en }; use pick(field, lang) to render.
import {
  Cpu, Code2, Globe, Braces, ShieldCheck, KanbanSquare,
  Facebook, Linkedin, Github, Youtube, Twitter,
} from 'lucide-react';

export const pick = (field, lang) =>
  field && typeof field === 'object' && 'ar' in field ? field[lang] || field.ar : field;

export const COMPANY = {
  name: 'CCS Technology',
  domain: 'www.ccs-technology.com',
  developer: 'Jihad Ahmad Obeid',
  hq: { ar: 'الشمال ,لبنان , المنيه الضنيه ', en: 'North , Lebanon , Meniyeh Daniyeh' },
  // Placeholder number — replace with the real business line before launch.
  phone: '+96103429802',
  emails: {
    general: 'info@ccs-technology.com',
    atheer: 'atheer@ccs-technology.com',
    technical: 'job.it.managment@ccs-technology.com',
  },
};

export const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, url: 'https://facebook.com/jihad.a.obeid', color: '#1877F2' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, url: 'https://www.linkedin.com/in/jihad-obeid-28566a342/', color: '#0A66C2' },
  { key: 'github', label: 'GitHub', icon: Github, url: 'https://github.com/jobitmanagment-netizen', color: '#EAECEF' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, url: 'https://youtube.com/@ccstechnology', color: '#FF0000' },
  { key: 'twitter', label: 'X (Twitter)', icon: Twitter, url: 'https://x.com/ccstechnology', color: '#EAECEF' },
];

export const SERVICES = [
  {
    id: 'hardware',
    icon: Cpu,
    title: { ar: 'أجهزة الكمبيوتر', en: 'Computer Hardware' },
    short: { ar: 'بيع وتركيب وصيانة الأجهزة', en: 'Sales, setup, and maintenance' },
    desc: {
      ar: 'توريد وتركيب وصيانة أجهزة الكمبيوتر والخوادم ومحطات العمل، مع دعم فني متكامل وحلول للبنية التحتية.',
      en: 'Supply, installation, and maintenance of computers, servers, and workstations with full technical support and infrastructure solutions.',
    },
  },
  {
    id: 'software',
    icon: Code2,
    title: { ar: 'البرمجيات', en: 'Software' },
    short: { ar: 'تطوير برامج مخصصة وحلول Web3', en: 'Custom software & Web3 solutions' },
    desc: {
      ar: 'تطوير برامج مخصصة تناسب احتياجات عملك، بما في ذلك حلول Web3 والعقود الذكية وتطبيقات البلوكتشين.',
      en: 'Custom software tailored to your business, including Web3 solutions, smart contracts, and blockchain applications.',
    },
  },
  {
    id: 'web',
    icon: Globe,
    title: { ar: 'تطوير الويب', en: 'Web Development' },
    short: { ar: 'مواقع، تطبيقات ويب، منصات', en: 'Websites, web apps, platforms' },
    desc: {
      ar: 'تصميم وتطوير مواقع وتطبيقات ويب ومنصات متكاملة عالية الأداء، متجاوبة بالكامل ومحسّنة لمحركات البحث.',
      en: 'Design and development of high-performance websites, web apps, and full platforms — fully responsive and SEO-optimized.',
    },
  },
  {
    id: 'programming',
    icon: Braces,
    title: { ar: 'البرمجة وحلول AI', en: 'Programming & AI' },
    short: { ar: 'تطوير تطبيقات وحلول ذكاء اصطناعي', en: 'App development & AI solutions' },
    desc: {
      ar: 'تطوير تطبيقات الهاتف والويب وحلول الذكاء الاصطناعي، من نماذج التنبؤ إلى الأتمتة الذكية وتحليل البيانات.',
      en: 'Mobile and web app development plus AI solutions — from predictive models to intelligent automation and data analysis.',
    },
  },
  {
    id: 'security',
    icon: ShieldCheck,
    title: { ar: 'الأمن السيبراني', en: 'Cybersecurity' },
    short: { ar: 'اختبار الاختراق وحماية الأنظمة', en: 'Penetration testing & protection' },
    desc: {
      ar: 'حماية شاملة للأنظمة: اختبار اختراق، تدقيق أمني، تشفير عسكري المستوى، ومراقبة التهديدات في الوقت الحقيقي.',
      en: 'End-to-end system protection: penetration testing, security audits, military-grade encryption, and real-time threat monitoring.',
    },
  },
  {
    id: 'pm',
    icon: KanbanSquare,
    title: { ar: 'إدارة المشاريع', en: 'Project Management' },
    short: { ar: 'تخطيط، تنفيذ، ومتابعة', en: 'Planning, execution, tracking' },
    desc: {
      ar: 'إدارة احترافية لمشاريعك التقنية من التخطيط إلى التسليم، مع متابعة دقيقة للجودة والجداول الزمنية والميزانية.',
      en: 'Professional management of your technology projects from planning to delivery, with precise tracking of quality, timelines, and budget.',
    },
  },
];

export const PROJECTS = [
  {
    id: 'atheer',
    featured: true,
    category: 'software',
    title: { ar: 'منصة أثير Web3', en: 'Atheer Web3 Platform' },
    short: {
      ar: 'منصة تداول متعددة السلاسل مع تحليل مخاطر بالذكاء الاصطناعي',
      en: 'Multi-chain trading platform with AI risk analysis',
    },
    overview: {
      ar: 'منصة تداول واستثمار Web3 على مستوى المؤسسات تدعم Ethereum و BNB و Polygon و Tron، مع محرّك مخاطر بالذكاء الاصطناعي، تداول عقود آجلة، روبوتات تداول، ونظام إنذار تهديدات آلي وتشفير عسكري المستوى.',
      en: 'Enterprise-grade Web3 trading and investment platform supporting Ethereum, BNB, Polygon, and Tron — with an AI risk engine, futures trading, trading bots, automated threat alerts, and military-grade encryption.',
    },
    tech: ['React', 'Vite', 'Tailwind CSS', 'Firebase', 'Web3', 'AI'],
    color: '#F0B90B',
    liveUrl: '/atheer',
    repoUrl: 'https://github.com/ccs-technology',
  },
  {
    id: 'corporate-site',
    featured: true,
    category: 'web',
    title: { ar: 'موقع CCS Technology', en: 'CCS Technology Website' },
    short: { ar: 'الموقع المؤسسي متعدد اللغات', en: 'Multilingual corporate website' },
    overview: {
      ar: 'الموقع المؤسسي الذي تتصفحه الآن: منصة مركزية ثنائية اللغة (عربي/إنجليزي) تعرض خدمات الشركة ومشاريعها وتحميلاتها، مبنية بـ React و Tailwind مع تحسين كامل للأداء ومحركات البحث.',
      en: 'The corporate site you are browsing: a bilingual (Arabic/English) central platform showcasing the company services, projects, and downloads — built with React and Tailwind, fully optimized for performance and SEO.',
    },
    tech: ['React', 'Vite', 'Tailwind CSS', 'i18n', 'Framer Motion'],
    color: '#627EEA',
    liveUrl: '/',
  },
  {
    id: 'security-suite',
    featured: false,
    category: 'security',
    title: { ar: 'جناح الأمن السيبراني', en: 'Cybersecurity Suite' },
    short: { ar: 'أدوات تشفير ومراقبة تهديدات', en: 'Encryption & threat monitoring tools' },
    overview: {
      ar: 'مجموعة أدوات أمنية متكاملة تشمل التشفير AES-256-GCM و SHA-512، مراقبة التهديدات الآلية، تقارير المخاطر القابلة للتصدير، وسجلات تدقيق بتجزئة سلامة.',
      en: 'Integrated security toolset including AES-256-GCM and SHA-512 encryption, automated threat monitoring, exportable risk reports, and audit logs with integrity hashing.',
    },
    tech: ['Web Crypto API', 'React', 'Node', 'Deno'],
    color: '#CF304A',
    repoUrl: 'https://github.com/ccs-technology',
  },
  {
    id: 'ai-signals',
    featured: false,
    category: 'programming',
    title: { ar: 'محرّك إشارات التداول بالذكاء الاصطناعي', en: 'AI Trading Signals Engine' },
    short: { ar: 'تحليل فني مدعوم بنماذج لغوية', en: 'Technical analysis powered by LLMs' },
    overview: {
      ar: 'محرّك يجمع بين المؤشرات الفنية (RSI, MACD, SMA) والنماذج اللغوية الكبيرة لتوليد إشارات تداول ذكية وتحليلات سوقية لحظية.',
      en: 'An engine combining technical indicators (RSI, MACD, SMA) with large language models to generate intelligent trading signals and real-time market analysis.',
    },
    tech: ['Python', 'LLM', 'React', 'WebSocket'],
    color: '#03A66D',
  },
  {
    id: 'infra',
    featured: false,
    category: 'hardware',
    title: { ar: 'حلول البنية التحتية', en: 'Infrastructure Solutions' },
    short: { ar: 'تصميم وتجهيز مراكز بيانات', en: 'Data center design & provisioning' },
    overview: {
      ar: 'تصميم وتجهيز البنية التحتية لتقنية المعلومات للشركات: خوادم، شبكات، تخزين، وأنظمة نسخ احتياطي مع صيانة دورية.',
      en: 'Design and provisioning of enterprise IT infrastructure: servers, networking, storage, and backup systems with scheduled maintenance.',
    },
    tech: ['Linux', 'Networking', 'Virtualization', 'Cloud'],
    color: '#8247E5',
  },
];

export const DOWNLOADS = [
  {
    id: 'atheer-web',
    name: { ar: 'أثير للويب', en: 'Atheer for Web' },
    desc: { ar: 'الوصول الفوري للمنصة من متصفحك دون تثبيت', en: 'Instant browser access, no install required' },
    platform: 'Web',
    version: '2.4.0',
    size: '—',
    updated: '2026-06-15',
    href: '/atheer',
    available: true,
    color: '#F0B90B',
  },
  {
    id: 'atheer-android',
    name: { ar: 'أثير لنظام Android', en: 'Atheer for Android' },
    desc: { ar: 'حمّل ملف APK لأجهزة أندرويد', en: 'Download the APK for Android devices' },
    platform: 'Android',
    version: '2.4.0',
    size: '38 MB',
    updated: '2026-06-15',
    href: '/downloads/atheer-android.apk',
    available: true,
    color: '#3DDC84',
  },
  {
    id: 'atheer-ios',
    name: { ar: 'أثير لنظام iOS', en: 'Atheer for iOS' },
    desc: { ar: 'قريباً على App Store', en: 'Coming soon to the App Store' },
    platform: 'iOS',
    version: '—',
    size: '—',
    updated: '—',
    href: '/contact',
    available: false,
    color: '#EAECEF',
  },
];

export const BLOG_POSTS = [
  {
    slug: 'atheer-2-4-release',
    category: { ar: 'إعلان إصدار', en: 'Release' },
    title: { ar: 'إطلاق أثير 2.4: روبوتات تداول ونسخ صفقات', en: 'Atheer 2.4: Trading Bots & Copy Trading' },
    excerpt: {
      ar: 'يقدّم الإصدار 2.4 روبوتات التداول (Grid, DCA, Martingale) وميزة نسخ صفقات كبار المتداولين، إضافة إلى تحسينات في الأداء والأمان.',
      en: 'Version 2.4 introduces trading bots (Grid, DCA, Martingale) and copy trading from top traders, along with performance and security improvements.',
    },
    body: {
      ar: 'نعلن بكل فخر عن إطلاق الإصدار 2.4 من منصة أثير. يركّز هذا الإصدار على الأتمتة: روبوتات التداول تتيح تنفيذ استراتيجيات Grid و DCA و Martingale تلقائياً، بينما تمكّنك ميزة نسخ الصفقات من متابعة أداء كبار المتداولين ونسخ صفقاتهم بضغطة واحدة. كما حسّنّا زمن الاستجابة بنسبة 40% وأضفنا طبقات حماية إضافية.',
      en: 'We are proud to announce Atheer 2.4. This release focuses on automation: trading bots run Grid, DCA, and Martingale strategies automatically, while copy trading lets you follow top traders and mirror their trades with one click. We also improved latency by 40% and added extra protection layers.',
    },
    date: '2026-06-15',
    readMin: 4,
    author: 'CCS Technology',
    color: '#F0B90B',
  },
  {
    slug: 'ai-risk-engine',
    category: { ar: 'مقال تقني', en: 'Technical' },
    title: { ar: 'كيف يعمل محرّك المخاطر بالذكاء الاصطناعي', en: 'How Our AI Risk Engine Works' },
    excerpt: {
      ar: 'نظرة تقنية على كيفية تقييم محرّك المخاطر لكل معاملة وتصنيفها من "آمن" إلى "حرج" لحماية المستخدمين.',
      en: 'A technical look at how our risk engine scores each transaction and classifies it from “safe” to “critical” to protect users.',
    },
    body: {
      ar: 'يعتمد محرّك المخاطر لدينا على تحليل عشرات الإشارات لكل معاملة — سلوك المحفظة، أنماط التداول، والتفاعل مع العقود — لإنتاج درجة مخاطر من 0 إلى 100. تُصنّف الدرجات إلى خمس فئات، وتُتّخذ إجراءات آلية بناءً عليها، من الموافقة التلقائية إلى الحظر وتنبيه المشرفين.',
      en: 'Our risk engine analyzes dozens of signals per transaction — wallet behavior, trading patterns, and contract interactions — to produce a 0–100 risk score. Scores map to five tiers with automated actions, from auto-approval to blocking and alerting admins.',
    },
    date: '2026-05-28',
    readMin: 6,
    author: 'CCS Technology',
    color: '#03A66D',
  },
  {
    slug: 'ccs-launch',
    category: { ar: 'أخبار الشركة', en: 'Company News' },
    title: { ar: 'CCS Technology تطلق موقعها المؤسسي الجديد', en: 'CCS Technology Launches Its New Website' },
    excerpt: {
      ar: 'منصة مركزية ثنائية اللغة تجمع كل خدمات ومشاريع وتحميلات الشركة في مكان واحد.',
      en: 'A bilingual central platform bringing together all company services, projects, and downloads in one place.',
    },
    body: {
      ar: 'يسعدنا الإعلان عن إطلاق موقع CCS Technology الجديد. صُمّم الموقع ليكون نقطة الوصول المركزية لجميع أعمالنا: من تطوير الويب والبرمجيات إلى الأمن السيبراني وحلول Web3. الموقع متجاوب بالكامل، يدعم العربية والإنجليزية، ومحسّن للأداء وسرعة التحميل.',
      en: 'We are excited to launch the new CCS Technology website — the central access point for all our work: web and software development, cybersecurity, and Web3 solutions. The site is fully responsive, supports Arabic and English, and is optimized for performance and load speed.',
    },
    date: '2026-07-01',
    readMin: 3,
    author: 'CCS Technology',
    color: '#627EEA',
  },
];

export const STATS = [
  { value: '50+', label: { ar: 'مشروع منجز', en: 'Projects Delivered' } },
  { value: '30+', label: { ar: 'عميل سعيد', en: 'Happy Clients' } },
  { value: '6', label: { ar: 'مجالات خدمة', en: 'Service Areas' } },
  { value: '24/7', label: { ar: 'دعم فني', en: 'Support' } },
];

export const TEAM = [
  {
    name: 'Jihad Ahmad Obeid',
    role: { ar: 'المؤسس ومدير المشاريع', en: 'Founder & Project Director' },
    initials: 'JO',
    color: '#F0B90B',
  },
  {
    name: { ar: 'فريق التطوير', en: 'Development Team' },
    role: { ar: 'مهندسو برمجيات', en: 'Software Engineers' },
    initials: 'DEV',
    color: '#627EEA',
  },
  {
    name: { ar: 'فريق الأمن', en: 'Security Team' },
    role: { ar: 'باحثو أمن سيبراني', en: 'Security Researchers' },
    initials: 'SEC',
    color: '#CF304A',
  },
];

export const TESTIMONIALS = [
  {
    quote: {
      ar: 'فريق CCS Technology حوّل فكرتنا إلى منصة احترافية بجودة تفوق التوقعات. احترافية وسرعة في التنفيذ.',
      en: 'The CCS Technology team turned our idea into a professional platform beyond expectations. Professional and fast.',
    },
    name: { ar: 'عميل مؤسسي', en: 'Enterprise Client' },
    role: { ar: 'قطاع التكنولوجيا المالية', en: 'FinTech Sector' },
  },
  {
    quote: {
      ar: 'الأمان والأداء كانا أولوية في كل مرحلة. نوصي بهم لأي مشروع تقني حسّاس.',
      en: 'Security and performance were a priority at every stage. We recommend them for any sensitive tech project.',
    },
    name: { ar: 'شريك أعمال', en: 'Business Partner' },
    role: { ar: 'قطاع الأمن السيبراني', en: 'Cybersecurity Sector' },
  },
];

export const VALUES = [
  { title: { ar: 'الابتكار', en: 'Innovation' }, desc: { ar: 'نتبنى أحدث التقنيات لحل المشكلات المعقدة.', en: 'We adopt the latest technologies to solve complex problems.' } },
  { title: { ar: 'الأمان', en: 'Security' }, desc: { ar: 'الحماية مدمجة في كل سطر نكتبه.', en: 'Protection is built into every line we write.' } },
  { title: { ar: 'الجودة', en: 'Quality' }, desc: { ar: 'لا نساوم على معايير الجودة والأداء.', en: 'We never compromise on quality and performance.' } },
  { title: { ar: 'الشفافية', en: 'Transparency' }, desc: { ar: 'تواصل واضح ومتابعة دقيقة في كل مرحلة.', en: 'Clear communication and precise tracking at every stage.' } },
];

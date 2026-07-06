const translations = {
  en: {
    nav: { dashboard: 'Dashboard', trading: 'Trading', markets: 'Markets', wallet: 'Wallet', earn: 'Earn', more: 'More' },
    auth: { login: 'Login', register: 'Register', logout: 'Logout', email: 'Email', password: 'Password', forgotPassword: 'Forgot Password' },
    trading: { buy: 'Buy', sell: 'Sell', limit: 'Limit', market: 'Market', stop: 'Stop Loss', amount: 'Amount', price: 'Price', total: 'Total', orderBook: 'Order Book', openOrders: 'Open Orders', orderHistory: 'Order History' },
    wallet: { balance: 'Balance', deposit: 'Deposit', withdraw: 'Withdraw', transfer: 'Transfer', history: 'History', locked: 'Locked' },
    common: { loading: 'Loading...', error: 'Error', success: 'Success', cancel: 'Cancel', confirm: 'Confirm', save: 'Save', delete: 'Delete', search: 'Search', filter: 'Filter', all: 'All', noData: 'No data available', refresh: 'Refresh', back: 'Back', next: 'Next', close: 'Close' },
    earn: { staking: 'Staking', liquidity: 'Liquidity', apr: 'APR', tvl: 'TVL', stake: 'Stake', unstake: 'Unstake' },
    futures: { long: 'Long', short: 'Short', leverage: 'Leverage', margin: 'Margin', liquidation: 'Liquidation', pnl: 'PnL', positionSize: 'Position Size', openInterest: 'Open Interest', fundingRate: 'Funding Rate' },
    security: { twoFactor: '2FA', kyc: 'KYC Verification', alerts: 'Security Alerts', threats: 'Threat Reports', apiKeys: 'API Keys', sessions: 'Active Sessions' },
    admin: { dashboard: 'Admin Dashboard', users: 'Users', threats: 'Threats', audit: 'Audit Logs', settings: 'Settings', apiKeys: 'API Keys' },
    settings: { profile: 'Profile', security: 'Security', notifications: 'Notifications', appearance: 'Appearance', language: 'Language', api: 'API Management' },
    home: { heroTitle: 'Next-Gen DeFi Exchange', heroSub: 'Trade, earn, and secure your assets with AI-powered intelligence', getStarted: 'Get Started', startTrading: 'Start Trading', features: 'Platform Features' },
  },
  ar: {
    nav: { dashboard: 'لوحة التحكم', trading: 'التداول', markets: 'الأسواق', wallet: 'المحفظة', earn: 'الربح', more: 'المزيد' },
    auth: { login: 'تسجيل الدخول', register: 'إنشاء حساب', logout: 'تسجيل الخروج', email: 'البريد الإلكتروني', password: 'كلمة المرور', forgotPassword: 'نسيت كلمة المرور' },
    trading: { buy: 'شراء', sell: 'بيع', limit: 'محدد', market: 'سوق', stop: 'وقف الخسارة', amount: 'الكمية', price: 'السعر', total: 'الإجمالي', orderBook: 'سجل الأوامر', openOrders: 'الطلبات المفتوحة', orderHistory: 'سجل الصفقات' },
    wallet: { balance: 'الرصيد', deposit: 'إيداع', withdraw: 'سحب', transfer: 'تحويل', history: 'السجل', locked: 'مقفل' },
    common: { loading: 'جار التحميل...', error: 'خطأ', success: 'تم بنجاح', cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', delete: 'حذف', search: 'بحث', filter: 'تصفية', all: 'الكل', noData: 'لا توجد بيانات', refresh: 'تحديث', back: 'رجوع', next: 'التالي', close: 'إغلاق' },
    earn: { staking: 'التجميد', liquidity: 'السيولة', apr: 'العائد السنوي', tvl: 'القيمة الإجمالية', stake: 'تجميد', unstake: 'فك التجميد' },
    futures: { long: 'شراء', short: 'بيع', leverage: 'الرافعة', margin: 'الهامش', liquidation: 'التصفية', pnl: 'الأرباح', positionSize: 'حجم المركز', openInterest: 'الفائدة المفتوحة', fundingRate: 'سعر التمويل' },
    security: { twoFactor: 'التحقق بخطوتين', kyc: 'التحقق من الهوية', alerts: 'تنبيهات الأمان', threats: 'تقارير التهديدات', apiKeys: 'مفاتيح API', sessions: 'الجلسات النشطة' },
    admin: { dashboard: 'لوحة الإدارة', users: 'المستخدمين', threats: 'التهديدات', audit: 'سجل التدقيق', settings: 'الإعدادات', apiKeys: 'مفاتيح API' },
    settings: { profile: 'الملف الشخصي', security: 'الأمان', notifications: 'الإشعارات', appearance: 'المظهر', language: 'اللغة', api: 'إدارة API' },
    home: { heroTitle: 'منصة DeFi من الجيل التالي', heroSub: 'تداول واربح وأمن أصولك باستخدام الذكاء الاصطناعي', getStarted: 'ابدأ الآن', startTrading: 'ابدأ التداول', features: 'مميزات المنصة' },
  },
};

let currentLang = 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }
}

export function getLanguage() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lang');
    if (saved && translations[saved]) currentLang = saved;
  }
  return currentLang;
}

export function t(path, lang) {
  const l = lang || getLanguage();
  const keys = path.split('.');
  let result = translations[l];
  for (const key of keys) {
    if (result && result[key] !== undefined) result = result[key];
    else return path;
  }
  return result;
}

export function useTranslate() {
  getLanguage();
  return {
    t: (path) => t(path, currentLang),
    setLang: setLanguage,
    lang: currentLang,
    isRTL: currentLang === 'ar',
  };
}

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
];

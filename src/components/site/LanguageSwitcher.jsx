import { Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${className}`}
      style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}
    >
      <Languages className="w-3.5 h-3.5" style={{ color: '#F0B90B' }} />
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, DEFAULT_LANG } from '@/i18n/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'ccs_lang';

// Resolve a dot-path (e.g. "nav.home") against a nested dictionary,
// falling back to the key itself so missing strings are visible, not blank.
function resolve(dict, path) {
  const value = path.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), dict);
  return value == null ? path : value;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && translations[stored] ? stored : DEFAULT_LANG;
  });

  const dir = translations[lang]?.dir || 'ltr';

  // Keep <html lang>/<html dir> in sync so native RTL, form controls, and
  // scrollbars behave correctly across the whole document.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', dir);
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const t = useCallback(
    (path) => resolve(translations[lang], path),
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const value = useMemo(
    () => ({ lang, dir, isRTL: dir === 'rtl', t, setLang, toggleLang }),
    [lang, dir, t, toggleLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

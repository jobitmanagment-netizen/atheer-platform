import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SERVICES, pick } from '@/lib/site-data';
import Seo from '@/components/site/Seo';

export default function Services() {
  const { t, lang, isRTL } = useLanguage();
  const { hash } = useLocation();

  // Deep-link to a specific service card via #id (e.g. from the footer).
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [hash]);

  return (
    <div>
      <Seo title={`${t('services.title')} — CCS Technology`} description={t('services.subtitle')} />

      <PageHeader title={t('services.title')} subtitle={t('services.subtitle')} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        {SERVICES.map((s) => (
          <motion.div
            key={s.id}
            id={s.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="scroll-mt-24 flex flex-col md:flex-row gap-6 p-7 rounded-2xl"
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div className="shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
                <s.icon className="w-8 h-8" style={{ color: '#F0B90B' }} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#EAECEF' }}>{pick(s.title, lang)}</h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#848E9C' }}>{pick(s.desc, lang)}</p>
              <Link
                to={`/contact?service=${s.id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-gold"
              >
                {t('services.cta')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>
            <div className="hidden lg:flex items-center">
              <Check className="w-6 h-6" style={{ color: '#03A66D' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="border-b" style={{ borderColor: '#1E2329', background: '#0A0C0F' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-black" style={{ color: '#EAECEF' }}>{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: '#848E9C' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

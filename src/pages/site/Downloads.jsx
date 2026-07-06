import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Globe, Smartphone, Apple, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { DOWNLOADS, pick } from '@/lib/site-data';
import { PageHeader } from './Services';
import Seo from '@/components/site/Seo';

const PLATFORM_ICON = { Web: Globe, Android: Smartphone, iOS: Apple };

export default function Downloads() {
  const { t, lang } = useLanguage();

  return (
    <div>
      <Seo title={`${t('downloads.title')} — CCS Technology`} description={t('downloads.subtitle')} />
      <PageHeader title={t('downloads.title')} subtitle={t('downloads.subtitle')} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {DOWNLOADS.map((d, i) => {
            const Icon = PLATFORM_ICON[d.platform] || Download;
            const isInternal = d.href.startsWith('/') && !d.href.includes('.');
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex flex-col p-6 rounded-2xl"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${d.color}1A` }}>
                  <Icon className="w-7 h-7" style={{ color: d.color }} />
                </div>
                <h3 className="text-lg font-bold mb-1.5" style={{ color: '#EAECEF' }}>{pick(d.name, lang)}</h3>
                <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: '#848E9C' }}>{pick(d.desc, lang)}</p>

                <dl className="space-y-1.5 mb-5 text-xs" style={{ color: '#848E9C' }}>
                  <div className="flex justify-between"><dt>{t('downloads.version')}</dt><dd style={{ color: '#EAECEF' }}>{d.version}</dd></div>
                  <div className="flex justify-between"><dt>{t('downloads.size')}</dt><dd style={{ color: '#EAECEF' }}>{d.size}</dd></div>
                  <div className="flex justify-between"><dt>{t('downloads.updated')}</dt><dd style={{ color: '#EAECEF' }}>{d.updated}</dd></div>
                </dl>

                {d.available ? (
                  isInternal ? (
                    <Link to={d.href} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black gold-gradient">
                      <Download className="w-4 h-4" />
                      {t('downloads.download')}
                    </Link>
                  ) : (
                    <a href={d.href} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black gold-gradient" download>
                      <Download className="w-4 h-4" />
                      {t('downloads.download')}
                    </a>
                  )
                ) : (
                  <Link to="/contact" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black gold-gradient">
                    <Clock className="w-4 h-4" />
                    {t('downloads.comingSoon')}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

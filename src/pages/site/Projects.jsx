import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PROJECTS, SERVICES, pick } from '@/lib/site-data';
import { PageHeader } from './Services';
import Seo from '@/components/site/Seo';

export default function Projects() {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState('all');

  const categories = ['all', ...SERVICES.map((s) => s.id).filter((id) => PROJECTS.some((p) => p.category === id))];
  const catLabel = (id) =>
    id === 'all' ? t('projects.filterAll') : pick(SERVICES.find((s) => s.id === id)?.title, lang);

  const visible = filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <div>
      <Seo title={`${t('projects.title')} — CCS Technology`} description={t('projects.subtitle')} />
      <PageHeader title={t('projects.title')} subtitle={t('projects.subtitle')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 mb-10 justify-center">
          {categories.map((id) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              style={
                filter === id
                  ? { background: '#F0B90B', color: '#0B0E11' }
                  : { background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }
              }
            >
              {catLabel(id)}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
            >
              <Link
                to={`/projects/${p.id}`}
                className="group block h-full rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}
              >
                <div className="h-36 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${p.color}22, transparent)` }}>
                  <span className="text-4xl font-black" style={{ color: p.color }}>{pick(p.title, lang).charAt(0)}</span>
                </div>
                <div className="p-6">
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: p.color }}>
                    {pick(SERVICES.find((s) => s.id === p.category)?.title, lang)}
                  </span>
                  <h3 className="mt-1.5 text-lg font-bold flex items-center gap-2" style={{ color: '#EAECEF' }}>
                    {pick(p.title, lang)}
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#F0B90B' }} />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: '#848E9C' }}>{pick(p.short, lang)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Sparkles, Quote, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SERVICES, PROJECTS, STATS, TESTIMONIALS, pick } from '@/lib/site-data';
import Seo from '@/components/site/Seo';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
};

export default function Home() {
  const { t, lang, isRTL } = useLanguage();
  const featured = PROJECTS.filter((p) => p.featured);

  return (
    <div>
      <Seo
        title="CCS Technology — حيث يلتقي الابتكار بالتكنولوجيا"
        description="شركة تقنية متكاملة: تطوير الويب، البرمجيات، حلول Web3، الأمن السيبراني، وإدارة المشاريع."
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(240,185,11,0.14) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.25)' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#F0B90B' }} />
            <span className="text-xs font-bold" style={{ color: '#F0B90B' }}>{t('home.heroBadge')}</span>
          </motion.div>

          <motion.h1 initial="hidden" animate="show" custom={1} variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight"
            style={{ color: '#EAECEF' }}>
            CCS <span className="text-gold">Technology</span>
          </motion.h1>

          <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp}
            className="mt-4 text-xl sm:text-2xl font-bold" style={{ color: '#F0B90B' }}>
            {t('home.heroSubtitle')}
          </motion.p>

          <motion.p initial="hidden" animate="show" custom={3} variants={fadeUp}
            className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed" style={{ color: '#848E9C' }}>
            {t('home.heroDesc')}
          </motion.p>

          <motion.div initial="hidden" animate="show" custom={4} variants={fadeUp}
            className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link to="/services" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-black gold-gradient">
              {t('home.ctaServices')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
            <Link to="/downloads" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
              <Download className="w-4 h-4" style={{ color: '#F0B90B' }} />
              {t('home.ctaDownloads')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead title={t('home.servicesTitle')} subtitle={t('home.servicesSubtitle')} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <motion.div key={s.id} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} custom={i} variants={fadeUp}>
              <Link to={`/services#${s.id}`}
                className="group block h-full p-6 rounded-2xl transition-all hover:-translate-y-1"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(240,185,11,0.12)' }}>
                  <s.icon className="w-6 h-6" style={{ color: '#F0B90B' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#EAECEF' }}>{pick(s.title, lang)}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{pick(s.short, lang)}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured projects */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead title={t('home.projectsTitle')} subtitle={t('home.projectsSubtitle')} />
        <div className="grid gap-6 md:grid-cols-2">
          {featured.map((p, i) => (
            <motion.div key={p.id} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} custom={i} variants={fadeUp}>
              <Link to={`/projects/${p.id}`}
                className="group block h-full rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="h-40 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${p.color}22, transparent)` }}>
                  <span className="text-4xl font-black" style={{ color: p.color }}>{pick(p.title, lang).charAt(0)}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#EAECEF' }}>
                    {pick(p.title, lang)}
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#F0B90B' }} />
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{pick(p.short, lang)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-gold">
            {t('home.viewAllProjects')}
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16" style={{ background: '#0A0C0F' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead title={t('home.statsTitle')} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fadeUp}
                className="p-6 rounded-2xl text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="text-4xl font-black text-gold">{s.value}</div>
                <div className="mt-1.5 text-sm" style={{ color: '#848E9C' }}>{pick(s.label, lang)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead title={t('home.testimonialsTitle')} subtitle={t('home.testimonialsSubtitle')} />
        <div className="grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((tm, i) => (
            <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fadeUp}
              className="p-7 rounded-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <Quote className="w-8 h-8 mb-4" style={{ color: 'rgba(240,185,11,0.4)' }} />
              <p className="text-base leading-relaxed mb-5" style={{ color: '#EAECEF' }}>{pick(tm.quote, lang)}</p>
              <div className="text-sm font-bold text-gold">{pick(tm.name, lang)}</div>
              <div className="text-xs" style={{ color: '#848E9C' }}>{pick(tm.role, lang)}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Download CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(240,185,11,0.14), rgba(255,153,0,0.05))', border: '1px solid rgba(240,185,11,0.25)' }}>
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: '#EAECEF' }}>{t('home.downloadCtaTitle')}</h2>
          <p className="max-w-2xl mx-auto text-base leading-relaxed mb-8" style={{ color: '#848E9C' }}>{t('home.downloadCtaDesc')}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/downloads" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-black gold-gradient">
              <Download className="w-4 h-4" />
              {t('home.ctaDownloads')}
            </Link>
            <Link to="/atheer" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
              {t('nav.launchApp')}
              <ArrowUpRight className="w-4 h-4" style={{ color: '#F0B90B' }} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#EAECEF' }}>{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl mx-auto text-base" style={{ color: '#848E9C' }}>{subtitle}</p>}
    </div>
  );
}

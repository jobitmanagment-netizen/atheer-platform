import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Target, Sparkles, ShieldCheck, Award, Handshake, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { COMPANY, VALUES, TEAM, STATS, pick } from '@/lib/site-data';
import { PageHeader } from './Services';
import Seo from '@/components/site/Seo';

const VALUE_ICONS = [Sparkles, ShieldCheck, Award, Handshake];

export default function About() {
  const { t, lang, isRTL } = useLanguage();

  return (
    <div>
      <Seo title={`${t('about.title')}`} description={t('about.subtitle')} />
      <PageHeader title={t('about.title')} subtitle={t('about.subtitle')} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-16">
        {/* Vision & Mission */}
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Eye, title: t('about.visionTitle'), body: t('about.vision') },
            { icon: Target, title: t('about.missionTitle'), body: t('about.mission') },
          ].map(({ icon: Icon, title, body }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="p-7 rounded-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(240,185,11,0.12)' }}>
                <Icon className="w-6 h-6" style={{ color: '#F0B90B' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#EAECEF' }}>{title}</h2>
              <p className="text-base leading-relaxed" style={{ color: '#848E9C' }}>{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="p-6 rounded-2xl text-center" style={{ background: '#0A0C0F', border: '1px solid #1E2329' }}>
              <div className="text-3xl font-black text-gold">{s.value}</div>
              <div className="mt-1 text-sm" style={{ color: '#848E9C' }}>{pick(s.label, lang)}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div>
          <h2 className="text-3xl font-black text-center mb-10" style={{ color: '#EAECEF' }}>{t('about.valuesTitle')}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
              return (
                <div key={i} className="p-6 rounded-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <Icon className="w-6 h-6 mb-3" style={{ color: '#F0B90B' }} />
                  <h3 className="text-base font-bold mb-1.5" style={{ color: '#EAECEF' }}>{pick(v.title, lang)}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{pick(v.desc, lang)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-3xl font-black text-center mb-2" style={{ color: '#EAECEF' }}>{t('about.teamTitle')}</h2>
          <p className="text-center mb-10" style={{ color: '#848E9C' }}>{t('about.teamSubtitle')}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {TEAM.map((member, i) => (
              <div key={i} className="p-7 rounded-2xl text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4"
                  style={{ background: `${member.color}1A`, border: `1px solid ${member.color}44` }}>
                  <span className="text-xl font-black" style={{ color: member.color }}>{member.initials}</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: '#EAECEF' }}>{pick(member.name, lang)}</h3>
                <p className="text-sm mt-1" style={{ color: '#848E9C' }}>{pick(member.role, lang)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(240,185,11,0.12), transparent)', border: '1px solid rgba(240,185,11,0.2)' }}>
          <p className="text-sm mb-2" style={{ color: '#848E9C' }}>{t('footer.developedBy')} {COMPANY.developer}</p>
          <Link to="/contact" className="inline-flex items-center gap-2 mt-3 px-7 py-3.5 rounded-xl text-sm font-bold text-black gold-gradient">
            {t('common.getStarted')}
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>
    </div>
  );
}

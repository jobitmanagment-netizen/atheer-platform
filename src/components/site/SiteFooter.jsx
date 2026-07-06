import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { COMPANY, SERVICES, pick } from '@/lib/site-data';
import SocialLinks from './SocialLinks';

const QUICK = [
  { to: '/services', key: 'nav.services' },
  { to: '/projects', key: 'nav.projects' },
  { to: '/downloads', key: 'nav.downloads' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
];

export default function SiteFooter() {
  const { t, lang } = useLanguage();
  const year = 2026;

  return (
    <footer className="border-t mt-20" style={{ borderColor: '#1E2329', background: '#0A0C0F' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center gold-gradient">
                <span className="text-black font-black text-lg">C</span>
              </div>
              <span className="font-black text-lg" style={{ color: '#EAECEF' }}>CCS Technology</span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{t('footer.about')}</p>
            <SocialLinks size="sm" />
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>{t('footer.quickLinks')}</h4>
            <ul className="space-y-2.5">
              {QUICK.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm transition-colors hover:text-gold" style={{ color: '#848E9C' }}>
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>{t('footer.services')}</h4>
            <ul className="space-y-2.5">
              {SERVICES.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link to={`/services#${s.id}`} className="text-sm transition-colors hover:text-gold" style={{ color: '#848E9C' }}>
                    {pick(s.title, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold mb-4" style={{ color: '#EAECEF' }}>{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#F0B90B' }} />
                <a href={`mailto:${COMPANY.emails.general}`} className="text-sm break-all transition-colors hover:text-gold" style={{ color: '#848E9C' }}>
                  {COMPANY.emails.general}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#F0B90B' }} />
                <span className="text-sm" style={{ color: '#848E9C' }}>{pick(COMPANY.hq, lang)}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t"
          style={{ borderColor: '#1E2329' }}
        >
          <p className="text-xs" style={{ color: '#848E9C' }}>
            © {year} CCS Technology. {t('footer.rights')}.
          </p>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            {t('footer.developedBy')} <span style={{ color: '#F0B90B' }}>{COMPANY.developer}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

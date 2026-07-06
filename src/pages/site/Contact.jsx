import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, MapPin, Phone, Send, Check, Wrench, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { COMPANY, SERVICES, pick } from '@/lib/site-data';
import { PageHeader } from './Services';
import SocialLinks from '@/components/site/SocialLinks';
import Seo from '@/components/site/Seo';

export default function Contact() {
  const { t, lang } = useLanguage();
  const [params] = useSearchParams();
  const serviceId = params.get('service');
  const serviceTitle = serviceId ? pick(SERVICES.find((s) => s.id === serviceId)?.title, lang) : '';

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: serviceTitle || '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      alert(t('contact.required'));
      return;
    }
    // No backend required: hand off to the visitor's mail client, addressed to
    // the general inbox (routed to the company via Cloudflare Email Routing).
    const subject = encodeURIComponent(form.subject || `Contact from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} <${form.email}>`);
    window.location.href = `mailto:${COMPANY.emails.general}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const emailCards = [
    { icon: Mail, label: t('contact.general'), email: COMPANY.emails.general, color: '#F0B90B' },
    { icon: Sparkles, label: t('contact.atheerSupport'), email: COMPANY.emails.atheer, color: '#627EEA' },
    { icon: Wrench, label: t('contact.technical'), email: COMPANY.emails.technical, color: '#03A66D' },
  ];

  return (
    <div>
      <Seo title={`${t('contact.title')} — CCS Technology`} description={t('contact.subtitle')} />
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3 text-gold">{t('contact.getInTouch')}</h2>
              <p className="text-base leading-relaxed" style={{ color: '#848E9C' }}>{t('contact.getInTouchDesc')}</p>
            </div>

            <div className="space-y-3">
              {emailCards.map(({ icon: Icon, label, email, color }) => (
                <div key={email} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1A` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold mb-0.5" style={{ color: '#EAECEF' }}>{label}</h3>
                    <a href={`mailto:${email}`} className="text-sm font-semibold break-all hover:text-gold" style={{ color }}>{email}</a>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(130,71,229,0.12)' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#8247E5' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-0.5" style={{ color: '#EAECEF' }}>{t('contact.hq')}</h3>
                  <p className="text-sm" style={{ color: '#848E9C' }}>{COMPANY.name}<br />{pick(COMPANY.hq, lang)}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(3,166,109,0.12)' }}>
                  <Phone className="w-5 h-5" style={{ color: '#03A66D' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-0.5" style={{ color: '#EAECEF' }}>{t('contact.phone')}</h3>
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} dir="ltr" className="text-sm font-semibold hover:text-gold" style={{ color: '#848E9C' }}>{COMPANY.phone}</a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>{t('contact.social')}</h3>
              <p className="text-sm mb-3" style={{ color: '#848E9C' }}>{t('contact.socialDesc')}</p>
              <SocialLinks />
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl p-6 h-fit" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="text-xl font-bold mb-6" style={{ color: '#EAECEF' }}>{t('contact.formTitle')}</h3>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(3,166,109,0.12)' }}>
                  <Check className="w-8 h-8" style={{ color: '#03A66D' }} />
                </div>
                <h4 className="text-lg font-bold mb-2" style={{ color: '#EAECEF' }}>{t('contact.sentTitle')}</h4>
                <p className="text-sm" style={{ color: '#848E9C' }}>{t('contact.sentDesc')}</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 px-6 py-2 rounded-lg text-sm font-medium"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
                  {t('contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={`${t('contact.name')} *`} value={form.name} onChange={set('name')} placeholder={t('contact.namePlaceholder')} required />
                <Field label={`${t('contact.email')} *`} type="email" value={form.email} onChange={set('email')} placeholder={t('contact.emailPlaceholder')} required />
                <Field label={t('contact.subject')} value={form.subject} onChange={set('subject')} placeholder={t('contact.subjectPlaceholder')} />
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>{t('contact.message')} *</label>
                  <textarea value={form.message} onChange={set('message')} placeholder={t('contact.messagePlaceholder')} required rows={5}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <button type="submit"
                  className="w-full py-3 rounded-xl text-sm font-bold text-black gold-gradient flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  {t('contact.send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>{label}</label>
      <input {...props} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
    </div>
  );
}

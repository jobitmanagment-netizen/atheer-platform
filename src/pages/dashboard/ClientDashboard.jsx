import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, FolderKanban, Download, Bell, LifeBuoy, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '../site/Services';
import TicketsPanel from '@/components/site/TicketsPanel';
import { ClientProjects, PROJECT_STATUSES, enumLabel, enumColor, isAdmin } from '@/lib/crm';
import { pick } from '@/lib/site-data';
import Seo from '@/components/site/Seo';

const TABS = [
  { id: 'projects', icon: FolderKanban, label: 'dash.myProjects' },
  { id: 'updates', icon: Bell, label: 'dash.updates' },
  { id: 'downloads', icon: Download, label: 'dash.downloads' },
  { id: 'tickets', icon: LifeBuoy, label: 'dash.tickets' },
  { id: 'profile', icon: User, label: 'dash.profile' },
];

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('projects');

  const email = user?.email || '';
  const myProjects = ClientProjects.list().filter((p) => p.clientEmail === email);
  // Fall back to demo data so a brand-new account still sees the dashboard shape.
  const projects = myProjects.length ? myProjects : ClientProjects.list().filter((p) => p.clientEmail === 'demo@client.com');
  const allUpdates = projects
    .flatMap((p) => (p.updates || []).map((u) => ({ ...u, project: p.title })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const allDownloads = projects.flatMap((p) => (p.downloads || []).map((d) => ({ ...d, project: p.title })));

  return (
    <div>
      <Seo title={`${t('dash.clientTitle')} — CCS Technology`} description={t('dash.clientSubtitle')} />
      <PageHeader title={t('dash.clientTitle')} subtitle={t('dash.welcome') + ' ' + (user?.displayName || email)} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[220px_1fr]">
        {/* Sidebar tabs */}
        <aside className="space-y-1 h-fit md:sticky md:top-24">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={tab === id
                ? { background: 'rgba(240,185,11,0.12)', color: '#F0B90B' }
                : { color: '#848E9C' }}>
              <Icon className="w-4 h-4" /> {t(label)}
            </button>
          ))}
          {isAdmin(user) && (
            <Link to="/dashboard/admin" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: '#627EEA' }}>
              <ExternalLink className="w-4 h-4" /> {t('dash.adminTitle')}
            </Link>
          )}
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: '#CF304A' }}>
            <LogOut className="w-4 h-4" /> {t('dash.logout')}
          </button>
        </aside>

        {/* Content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'projects' && (
            <Section title={t('dash.myProjects')}>
              {projects.length === 0 ? <Empty text={t('dash.noProjects')} /> : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {projects.map((p) => (
                    <div key={p.id} className="p-5 rounded-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold" style={{ color: '#EAECEF' }}>{pick(p.title, lang)}</h4>
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold" style={{ color: enumColor(PROJECT_STATUSES, p.status), background: `${enumColor(PROJECT_STATUSES, p.status)}1A` }}>
                          {enumLabel(PROJECT_STATUSES, p.status, lang)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#0B0E11' }}>
                        <div className="h-full gold-gradient" style={{ width: `${p.progress}%` }} />
                      </div>
                      <p className="text-xs" style={{ color: '#848E9C' }}>{p.progress}% · {t('dash.updated')} {p.updatedAt}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {tab === 'updates' && (
            <Section title={t('dash.updates')}>
              {allUpdates.length === 0 ? <Empty text={t('dash.noUpdates')} /> : (
                <div className="space-y-3">
                  {allUpdates.map((u, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                      <div className="w-2 h-2 mt-2 rounded-full shrink-0 gold-gradient" />
                      <div>
                        <p className="text-sm" style={{ color: '#EAECEF' }}>{pick(u.note, lang)}</p>
                        <p className="text-xs mt-1" style={{ color: '#848E9C' }}>{pick(u.project, lang)} · {u.at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {tab === 'downloads' && (
            <Section title={t('dash.downloads')}>
              {allDownloads.length === 0 ? <Empty text={t('dash.noDownloads')} /> : (
                <div className="space-y-3">
                  {allDownloads.map((d, i) => (
                    <a key={i} href={d.href} download className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Download className="w-4 h-4 shrink-0" style={{ color: '#F0B90B' }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{d.name}</p>
                          <p className="text-xs" style={{ color: '#848E9C' }}>{pick(d.project, lang)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gold">{t('dash.download')}</span>
                    </a>
                  ))}
                </div>
              )}
            </Section>
          )}

          {tab === 'tickets' && (
            <Section title={t('dash.tickets')}>
              <TicketsPanel scopeEmail={email} isAdmin={false} />
            </Section>
          )}

          {tab === 'profile' && (
            <Section title={t('dash.profile')}>
              <div className="p-6 rounded-2xl space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-black text-xl font-black gold-gradient">
                    {(user?.displayName || email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: '#EAECEF' }}>{user?.displayName || t('dash.client')}</p>
                    <p className="text-sm" style={{ color: '#848E9C' }}>{email}</p>
                  </div>
                </div>
                <Row label={t('dash.email')} value={email} />
                <Row label={t('dash.accountId')} value={user?.uid || '—'} />
                <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-gold">
                  {t('dash.editProfile')} <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </Section>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-5" style={{ color: '#EAECEF' }}>{title}</h3>
      {children}
    </div>
  );
}
function Empty({ text }) {
  return <p className="text-sm py-10 text-center" style={{ color: '#848E9C' }}>{text}</p>;
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: '#2B3139' }}>
      <span className="text-sm" style={{ color: '#848E9C' }}>{label}</span>
      <span className="text-sm font-semibold break-all" style={{ color: '#EAECEF' }}>{value}</span>
    </div>
  );
}

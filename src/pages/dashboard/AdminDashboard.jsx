import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, FolderKanban, Users, LifeBuoy, FileText, LogOut,
  Plus, Pencil, Trash2, Check, X, Ban, RotateCcw, Eye, Download, Users2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '../site/Services';
import TicketsPanel from '@/components/site/TicketsPanel';
import {
  CmsProjects, ManagedUsers, Tickets, Articles, Announcements,
} from '@/lib/crm';
import { pick } from '@/lib/site-data';
import Seo from '@/components/site/Seo';

const TABS = [
  { id: 'stats', icon: BarChart3, label: 'admin.stats' },
  { id: 'projects', icon: FolderKanban, label: 'admin.projects' },
  { id: 'users', icon: Users, label: 'admin.users' },
  { id: 'support', icon: LifeBuoy, label: 'admin.support' },
  { id: 'content', icon: FileText, label: 'admin.content' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('stats');

  return (
    <div>
      <Seo title={`${t('admin.title')} — CCS Technology`} description={t('admin.subtitle')} />
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 h-fit md:sticky md:top-24">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={tab === id ? { background: 'rgba(240,185,11,0.12)', color: '#F0B90B' } : { color: '#848E9C' }}>
              <Icon className="w-4 h-4" /> {t(label)}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: '#CF304A' }}>
            <LogOut className="w-4 h-4" /> {t('dash.logout')}
          </button>
        </aside>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'stats' && <Stats t={t} />}
          {tab === 'projects' && <Projects t={t} lang={lang} />}
          {tab === 'users' && <UsersManager t={t} />}
          {tab === 'support' && (
            <div>
              <h3 className="text-xl font-bold mb-5" style={{ color: '#EAECEF' }}>{t('admin.support')}</h3>
              <TicketsPanel isAdmin scopeEmail={user?.email} />
            </div>
          )}
          {tab === 'content' && <Content t={t} lang={lang} />}
        </motion.div>
      </div>
    </div>
  );
}

function Stats({ t }) {
  // Visitor/download counters are illustrative here; wire to real analytics in
  // production. Project/ticket/user counts are read live from the store.
  const cards = [
    { icon: Eye, label: t('admin.visitors'), value: '12,480', color: '#627EEA' },
    { icon: Download, label: t('admin.downloadsCount'), value: '3,215', color: '#03A66D' },
    { icon: FolderKanban, label: t('admin.projectsCount'), value: String(CmsProjects.list().length), color: '#F0B90B' },
    { icon: Users2, label: t('admin.usersCount'), value: String(ManagedUsers.list().length), color: '#8247E5' },
    { icon: LifeBuoy, label: t('admin.openTickets'), value: String(Tickets.list().filter((x) => x.status !== 'closed').length), color: '#CF304A' },
    { icon: FileText, label: t('admin.articlesCount'), value: String(Articles.list().length), color: '#F6465D' },
  ];
  return (
    <div>
      <h3 className="text-xl font-bold mb-5" style={{ color: '#EAECEF' }}>{t('admin.stats')}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="p-5 rounded-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${c.color}1A` }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: '#EAECEF' }}>{c.value}</p>
            <p className="text-sm" style={{ color: '#848E9C' }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Projects({ t, lang }) {
  const [rows, setRows] = useState(CmsProjects.list());
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: { ar: '', en: '' }, category: '' });
  const refresh = () => setRows(CmsProjects.list());

  const startNew = () => { setDraft({ title: { ar: '', en: '' }, category: '' }); setEditing('new'); };
  const startEdit = (r) => { setDraft({ title: { ar: r.title?.ar || '', en: r.title?.en || '' }, category: r.category || '' }); setEditing(r.id); };
  const save = () => {
    if (editing === 'new') CmsProjects.create(draft);
    else CmsProjects.update(editing, draft);
    setEditing(null); refresh();
  };
  const del = (id) => { CmsProjects.remove(id); refresh(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold" style={{ color: '#EAECEF' }}>{t('admin.projects')} <span style={{ color: '#848E9C' }}>({rows.length})</span></h3>
        <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient"><Plus className="w-4 h-4" /> {t('cms.add')}</button>
      </div>
      {editing && (
        <div className="mb-5 p-5 rounded-xl space-y-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <input value={draft.title[lang]} onChange={(e) => setDraft((p) => ({ ...p, title: { ...p.title, [lang]: e.target.value } }))} placeholder={t('cms.title2')}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
          <input value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} placeholder="category"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
          <div className="flex items-center gap-2">
            <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient"><Check className="w-4 h-4" /> {t('cms.save')}</button>
            <button onClick={() => setEditing(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: '#848E9C', border: '1px solid #2B3139' }}><X className="w-4 h-4" /> {t('cms.cancel')}</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{pick(r.title, lang)}</p>
              <p className="text-xs" style={{ color: '#848E9C' }}>{r.category} · #{r.id}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => startEdit(r)} className="p-2 rounded-lg" style={{ color: '#F0B90B' }}><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(r.id)} className="p-2 rounded-lg" style={{ color: '#CF304A' }}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersManager({ t }) {
  const [rows, setRows] = useState(ManagedUsers.list());
  const refresh = () => setRows(ManagedUsers.list());
  const toggle = (u) => { ManagedUsers.update(u.id, { status: u.status === 'suspended' ? 'active' : 'suspended' }); refresh(); };
  const del = (id) => { ManagedUsers.remove(id); refresh(); };

  return (
    <div>
      <h3 className="text-xl font-bold mb-5" style={{ color: '#EAECEF' }}>{t('admin.users')} <span style={{ color: '#848E9C' }}>({rows.length})</span></h3>
      <div className="space-y-2">
        {rows.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{u.name} {u.status === 'suspended' && <span className="text-xs" style={{ color: '#CF304A' }}>({t('admin.suspended')})</span>}</p>
              <p className="text-xs" style={{ color: '#848E9C' }}>{u.email} · {u.joinedAt}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggle(u)} className="p-2 rounded-lg" style={{ color: u.status === 'suspended' ? '#03A66D' : '#F0B90B' }} title={t('admin.suspend')}>
                {u.status === 'suspended' ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </button>
              <button onClick={() => del(u.id)} className="p-2 rounded-lg" style={{ color: '#CF304A' }} title={t('admin.deleteUser')}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Content({ t, lang }) {
  const [rows, setRows] = useState(Announcements.list());
  const [draft, setDraft] = useState({ ar: '', en: '' });
  const refresh = () => setRows(Announcements.list());
  const add = () => {
    if (!draft[lang].trim()) return;
    Announcements.create({ title: { ...draft }, body: { ar: '', en: '' }, active: true, date: new Date().toISOString().slice(0, 10) });
    setDraft({ ar: '', en: '' }); refresh();
  };
  const del = (id) => { Announcements.remove(id); refresh(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold" style={{ color: '#EAECEF' }}>{t('admin.content')}</h3>
        <Link to="/dashboard/content" className="text-sm font-bold text-gold">{t('admin.openCms')} →</Link>
      </div>
      <div className="p-5 rounded-xl mb-5" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>{t('admin.newAnnouncement')}</label>
        <div className="flex items-center gap-2">
          <input value={draft[lang]} onChange={(e) => setDraft((p) => ({ ...p, [lang]: e.target.value }))}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
          <button onClick={add} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{pick(a.title, lang)}</p>
              <p className="text-xs" style={{ color: '#848E9C' }}>{a.date}</p>
            </div>
            <button onClick={() => del(a.id)} className="p-2 rounded-lg shrink-0" style={{ color: '#CF304A' }}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

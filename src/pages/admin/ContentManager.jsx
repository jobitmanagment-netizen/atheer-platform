// CCS Technology — Content Management System.
// Manages articles, services, projects, and announcements (add / edit / delete).
// Bilingual text fields are edited in the active UI language and stored to both
// { ar, en } keys so the public site keeps rendering in either locale.
import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '../site/Services';
import {
  Articles, Announcements, CmsProjects, CmsServices,
} from '@/lib/crm';
import { pick } from '@/lib/site-data';
import Seo from '@/components/site/Seo';

const nowISO = () => new Date().toISOString().slice(0, 10);

// Field descriptors per collection. `bilingual: true` fields read/write { ar, en }.
const SCHEMAS = {
  articles: {
    collection: Articles, idPrefix: 'ART', titleKey: 'cms.articles',
    fields: [
      { key: 'title', label: { ar: 'العنوان', en: 'Title' }, bilingual: true },
      { key: 'excerpt', label: { ar: 'المقتطف', en: 'Excerpt' }, bilingual: true },
      { key: 'slug', label: { ar: 'المُعرّف (slug)', en: 'Slug' } },
    ],
    stampDate: true,
  },
  announcements: {
    collection: Announcements, idPrefix: 'ANN', titleKey: 'cms.announcements',
    fields: [
      { key: 'title', label: { ar: 'العنوان', en: 'Title' }, bilingual: true },
      { key: 'body', label: { ar: 'النص', en: 'Body' }, bilingual: true },
    ],
    stampDate: true,
  },
  services: {
    collection: CmsServices, idPrefix: 'SVC', titleKey: 'cms.services',
    fields: [
      { key: 'title', label: { ar: 'الاسم', en: 'Name' }, bilingual: true },
      { key: 'short', label: { ar: 'وصف مختصر', en: 'Short description' }, bilingual: true },
    ],
  },
  projects: {
    collection: CmsProjects, idPrefix: 'PRJ', titleKey: 'cms.projects',
    fields: [
      { key: 'title', label: { ar: 'العنوان', en: 'Title' }, bilingual: true },
      { key: 'category', label: { ar: 'التصنيف', en: 'Category' } },
    ],
  },
};

export default function ContentManager() {
  const { t, lang } = useLanguage();
  const [active, setActive] = useState('articles');
  const schema = SCHEMAS[active];

  return (
    <div>
      <Seo title={`${t('cms.title')} — CCS Technology`} description={t('cms.subtitle')} />
      <PageHeader title={t('cms.title')} subtitle={t('cms.subtitle')} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(SCHEMAS).map(([key, s]) => (
            <button key={key} onClick={() => setActive(key)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              style={active === key
                ? { background: '#F0B90B', color: '#0A0A0A' }
                : { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }}>
              {t(s.titleKey)}
            </button>
          ))}
        </div>
        <Manager key={active} schema={schema} lang={lang} t={t} />
      </div>
    </div>
  );
}

function blankRecord(schema) {
  const rec = {};
  schema.fields.forEach((f) => { rec[f.key] = f.bilingual ? { ar: '', en: '' } : ''; });
  return rec;
}

function Manager({ schema, lang, t }) {
  const [rows, setRows] = useState(schema.collection.list());
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const [draft, setDraft] = useState(blankRecord(schema));

  const refresh = () => setRows(schema.collection.list());

  const startNew = () => { setDraft(blankRecord(schema)); setEditing('new'); };
  const startEdit = (row) => {
    const d = {};
    schema.fields.forEach((f) => {
      d[f.key] = f.bilingual ? { ar: row[f.key]?.ar || '', en: row[f.key]?.en || '' } : (row[f.key] || '');
    });
    setDraft(d); setEditing(row.id);
  };
  const cancel = () => { setEditing(null); setDraft(blankRecord(schema)); };

  const save = () => {
    const payload = { ...draft };
    if (schema.stampDate) payload.date = payload.date || nowISO();
    if (editing === 'new') schema.collection.create(payload, nowISO());
    else schema.collection.update(editing, payload);
    cancel(); refresh();
  };
  const del = (id) => { schema.collection.remove(id); refresh(); };

  const setField = (f, value) => {
    setDraft((p) => (f.bilingual
      ? { ...p, [f.key]: { ...p[f.key], [lang]: value } }
      : { ...p, [f.key]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>{t(schema.titleKey)} <span style={{ color: '#848E9C' }}>({rows.length})</span></h3>
        <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient">
          <Plus className="w-4 h-4" /> {t('cms.add')}
        </button>
      </div>

      {editing && (
        <div className="mb-5 p-5 rounded-xl space-y-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          {schema.fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>{pick(f.label, lang)}</label>
              <input
                value={f.bilingual ? (draft[f.key]?.[lang] || '') : (draft[f.key] || '')}
                onChange={(e) => setField(f, e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient">
              <Check className="w-4 h-4" /> {t('cms.save')}
            </button>
            <button onClick={cancel} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: '#848E9C', border: '1px solid #2B3139' }}>
              <X className="w-4 h-4" /> {t('cms.cancel')}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: '#848E9C' }}>{t('cms.empty')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const first = schema.fields[0];
            const title = first.bilingual ? pick(row[first.key], lang) : row[first.key];
            return (
              <div key={row.id} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{title || '—'}</p>
                  <p className="text-xs" style={{ color: '#848E9C' }}>#{row.id}{row.date ? ` · ${row.date}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(row)} className="p-2 rounded-lg" style={{ color: '#F0B90B' }}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => del(row.id)} className="p-2 rounded-lg" style={{ color: '#CF304A' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

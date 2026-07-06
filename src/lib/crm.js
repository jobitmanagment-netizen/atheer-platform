// CCS Technology — corporate CRM domain data (tickets, client projects,
// articles, announcements, managed users) built on the localStorage store.
import { makeCollection } from './ccs-store';
import { PROJECTS, BLOG_POSTS, pick } from './site-data';

// ── Roles / privileges ───────────────────────────────────────────────────────
// A user is an admin/manager if their UserProfile carries role 'admin',
// or if their email is on the owner allowlist below (so the founder can reach
// the admin dashboard before any role has been provisioned in the backend).
const ADMIN_EMAILS = ['job.it.managment@gmail.com', 'job.it.managment@ccs-technology.com'];

export function isAdmin(profileOrUser) {
  if (!profileOrUser) return false;
  const role = profileOrUser.role;
  const email = (profileOrUser.email || '').toLowerCase();
  return role === 'admin' || role === 'manager' || ADMIN_EMAILS.includes(email);
}

// ── Enumerations (bilingual labels) ──────────────────────────────────────────
export const TICKET_PRIORITIES = [
  { id: 'low', label: { ar: 'منخفضة', en: 'Low' }, color: '#03A66D' },
  { id: 'medium', label: { ar: 'متوسطة', en: 'Medium' }, color: '#F0B90B' },
  { id: 'high', label: { ar: 'عالية', en: 'High' }, color: '#F6465D' },
  { id: 'urgent', label: { ar: 'عاجلة', en: 'Urgent' }, color: '#CF304A' },
];

export const TICKET_STATUSES = [
  { id: 'open', label: { ar: 'مفتوحة', en: 'Open' }, color: '#F0B90B' },
  { id: 'in_progress', label: { ar: 'قيد المعالجة', en: 'In Progress' }, color: '#627EEA' },
  { id: 'closed', label: { ar: 'مغلقة', en: 'Closed' }, color: '#848E9C' },
];

export const PROJECT_STATUSES = [
  { id: 'planning', label: { ar: 'تخطيط', en: 'Planning' }, color: '#627EEA' },
  { id: 'in_progress', label: { ar: 'قيد التنفيذ', en: 'In Progress' }, color: '#F0B90B' },
  { id: 'delivered', label: { ar: 'تم التسليم', en: 'Delivered' }, color: '#03A66D' },
];

export const enumLabel = (list, id, lang) => {
  const found = list.find((x) => x.id === id);
  return found ? pick(found.label, lang) : id;
};
export const enumColor = (list, id) => (list.find((x) => x.id === id) || {}).color || '#848E9C';

// ── Collections ──────────────────────────────────────────────────────────────
export const Tickets = makeCollection(
  'tickets',
  () => [
    {
      id: 'TCK1',
      userEmail: 'demo@client.com',
      subject: 'استفسار حول تحديثات منصة أثير',
      description: 'أريد معرفة موعد إطلاق الميزات الجديدة في لوحة التداول.',
      priority: 'medium',
      status: 'in_progress',
      createdAt: '2026-06-20',
      replies: [
        { by: 'CCS Technology', role: 'admin', text: 'شكراً لتواصلك، سيصدر التحديث خلال أسبوعين.', at: '2026-06-21' },
      ],
    },
  ],
  'TCK',
);

// Client project assignments — separate from the public PROJECTS showcase.
export const ClientProjects = makeCollection(
  'client_projects',
  () => [
    {
      id: 'CP1',
      clientEmail: 'demo@client.com',
      title: { ar: 'موقع الشركة المؤسسي', en: 'Corporate Website' },
      status: 'in_progress',
      progress: 65,
      updatedAt: '2026-06-28',
      updates: [
        { at: '2026-06-28', note: { ar: 'اكتمل تصميم الصفحة الرئيسية والخدمات.', en: 'Home and Services pages design completed.' } },
        { at: '2026-06-15', note: { ar: 'بدء مرحلة التطوير.', en: 'Development phase started.' } },
      ],
      downloads: [
        { name: 'ccs-software.zip', href: '/downloads/ccs-software.zip' },
      ],
    },
    {
      id: 'CP2',
      clientEmail: 'demo@client.com',
      title: { ar: 'تطبيق أثير للأندرويد', en: 'Atheer Android App' },
      status: 'delivered',
      progress: 100,
      updatedAt: '2026-06-15',
      updates: [
        { at: '2026-06-15', note: { ar: 'تم تسليم النسخة النهائية 2.4.0.', en: 'Final build 2.4.0 delivered.' } },
      ],
      downloads: [
        { name: 'atheer-android.apk', href: '/downloads/atheer-android.apk' },
      ],
    },
  ],
  'CP',
);

export const Articles = makeCollection(
  'articles',
  () =>
    BLOG_POSTS.map((p, i) => ({
      id: `ART${i + 1}`,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.date,
      published: true,
    })),
  'ART',
);

export const Announcements = makeCollection(
  'announcements',
  () => [
    {
      id: 'ANN1',
      title: { ar: 'إطلاق الموقع الجديد', en: 'New Website Launch' },
      body: { ar: 'يسعدنا الإعلان عن إطلاق موقع CCS Technology الجديد.', en: 'We are excited to launch the new CCS Technology website.' },
      date: '2026-07-01',
      active: true,
    },
  ],
  'ANN',
);

export const ManagedUsers = makeCollection(
  'managed_users',
  () => [
    { id: 'USR1', email: 'demo@client.com', name: 'Demo Client', role: 'user', status: 'active', joinedAt: '2026-05-10' },
    { id: 'USR2', email: 'partner@fintech.com', name: 'FinTech Partner', role: 'user', status: 'active', joinedAt: '2026-06-02' },
  ],
  'USR',
);

// Editable overlays for the public showcase managed via the CMS. Seeded from the
// static site-data so the CMS starts populated; edits persist to localStorage.
export const CmsServices = makeCollection(
  'cms_services',
  () => [],
  'SVC',
);
export const CmsProjects = makeCollection(
  'cms_projects',
  () => PROJECTS.map((p) => ({ id: p.id, title: p.title, category: p.category, featured: !!p.featured })),
  'PRJ',
);

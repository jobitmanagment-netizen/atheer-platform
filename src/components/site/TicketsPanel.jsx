// Reusable support-ticket UI: create, list-with-status, open detail, reply,
// and close. Used by both /support and the client dashboard. When `isAdmin` is
// true the panel shows every ticket and enables admin replies; otherwise it is
// scoped to `scopeEmail` and the visitor can create and reply to their own.
import { useState } from 'react';
import { Plus, MessageSquare, Send, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Tickets, TICKET_PRIORITIES, TICKET_STATUSES, enumLabel, enumColor,
} from '@/lib/crm';

const nowISO = () => new Date().toISOString().slice(0, 10);

export default function TicketsPanel({ scopeEmail, isAdmin = false }) {
  const { t, lang, isRTL } = useLanguage();
  const all = Tickets.list();
  const scoped = isAdmin ? all : all.filter((tk) => tk.userEmail === scopeEmail);

  const [tickets, setTickets] = useState(scoped);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [reply, setReply] = useState('');

  const refresh = () => {
    const list = Tickets.list();
    setTickets(isAdmin ? list : list.filter((tk) => tk.userEmail === scopeEmail));
  };

  const submitTicket = (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    Tickets.create(
      {
        userEmail: scopeEmail || 'anonymous',
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: 'open',
        replies: [],
      },
      nowISO(),
    );
    setForm({ subject: '', description: '', priority: 'medium' });
    setCreating(false);
    refresh();
  };

  const sendReply = (id) => {
    if (!reply.trim()) return;
    const tk = Tickets.get(id);
    Tickets.update(id, {
      status: tk.status === 'closed' ? 'closed' : 'in_progress',
      replies: [
        ...(tk.replies || []),
        { by: isAdmin ? 'CCS Technology' : scopeEmail, role: isAdmin ? 'admin' : 'user', text: reply.trim(), at: nowISO() },
      ],
    });
    setReply('');
    refresh();
  };

  const closeTicket = (id) => { Tickets.update(id, { status: 'closed' }); refresh(); };
  const reopenTicket = (id) => { Tickets.update(id, { status: 'open' }); refresh(); };

  const open = openId ? Tickets.get(openId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>
          {t('dash.tickets')} <span style={{ color: '#848E9C' }}>({tickets.length})</span>
        </h3>
        {!isAdmin && (
          <button onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black gold-gradient">
            <Plus className="w-4 h-4" /> {t('dash.newTicket')}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submitTicket} className="mb-5 p-4 rounded-xl space-y-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder={t('dash.ticketSubject')} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder={t('dash.ticketDesc')} required rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
          <div className="flex items-center gap-3">
            <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
              {TICKET_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{enumLabel(TICKET_PRIORITIES, p.id, lang)}</option>)}
            </select>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-black gold-gradient">
              <Send className="w-4 h-4" /> {t('dash.submit')}
            </button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#848E9C' }}>{t('dash.noTickets')}</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((tk) => (
            <button key={tk.id} onClick={() => setOpenId(tk.id)}
              className="w-full text-start flex items-center justify-between gap-3 p-4 rounded-xl transition-colors"
              style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <div className="min-w-0 flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: '#848E9C' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#EAECEF' }}>{tk.subject}</p>
                  <p className="text-xs" style={{ color: '#848E9C' }}>#{tk.id} · {tk.createdAt}{isAdmin ? ` · ${tk.userEmail}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Chip label={enumLabel(TICKET_PRIORITIES, tk.priority, lang)} color={enumColor(TICKET_PRIORITIES, tk.priority)} />
                <Chip label={enumLabel(TICKET_STATUSES, tk.status, lang)} color={enumColor(TICKET_STATUSES, tk.status)} />
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpenId(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl p-6" style={{ background: '#181A20', border: '1px solid #2B3139' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-bold" style={{ color: '#EAECEF' }}>{open.subject}</h4>
                <p className="text-xs mt-1" style={{ color: '#848E9C' }}>#{open.id} · {open.createdAt}{isAdmin ? ` · ${open.userEmail}` : ''}</p>
              </div>
              <button onClick={() => setOpenId(null)} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Chip label={enumLabel(TICKET_PRIORITIES, open.priority, lang)} color={enumColor(TICKET_PRIORITIES, open.priority)} />
              <Chip label={enumLabel(TICKET_STATUSES, open.status, lang)} color={enumColor(TICKET_STATUSES, open.status)} />
            </div>
            <p className="text-sm leading-relaxed mb-5 p-3 rounded-lg" style={{ color: '#EAECEF', background: '#0B0E11', border: '1px solid #2B3139' }}>{open.description}</p>

            <div className="space-y-2 mb-4">
              {(open.replies || []).map((r, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: r.role === 'admin' ? 'rgba(240,185,11,0.08)' : '#0B0E11', border: '1px solid #2B3139' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: r.role === 'admin' ? '#F0B90B' : '#848E9C' }}>{r.by} · {r.at}</p>
                  <p className="text-sm" style={{ color: '#EAECEF' }}>{r.text}</p>
                </div>
              ))}
            </div>

            {open.status !== 'closed' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('dash.replyPlaceholder')}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                  <button onClick={() => sendReply(open.id)} className="p-2.5 rounded-lg text-black gold-gradient">
                    <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <button onClick={() => closeTicket(open.id)} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: '#848E9C' }}>
                  <CheckCircle2 className="w-4 h-4" /> {t('dash.closeTicket')}
                </button>
              </>
            ) : (
              <button onClick={() => reopenTicket(open.id)} className="text-sm font-semibold text-gold">{t('dash.reopen')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span className="px-2.5 py-1 rounded-md text-xs font-bold" style={{ color, background: `${color}1A` }}>{label}</span>
  );
}

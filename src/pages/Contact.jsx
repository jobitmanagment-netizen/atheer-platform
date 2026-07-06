import { useState } from 'react';
import { Mail, MessageCircle, Globe, MapPin, Send, Check } from 'lucide-react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import { SOCIAL_LINKS } from '@/lib/site-data';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      alert('Please fill in all required fields');
      return;
    }
    setSending(true);
    try {
      const res = await ccs.functions.invoke('submitContactMessage', form);
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      logger.info('Contact', 'Contact form submitted', { contactId: d.message?.id, hasEmail: !!form.email, hasSubject: !!form.subject });
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (e) {
      logger.error('Contact', 'Failed to send message', { error: e?.message || String(e) });
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0B0E11' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1E2329' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
              <Mail className="w-6 h-6" style={{ color: '#F0B90B' }} />
            </div>
            <div>
              <h1 className="text-4xl font-black" style={{ color: '#EAECEF' }}>Contact Us</h1>
              <p className="text-sm mt-1" style={{ color: '#848E9C' }}>Get in touch with our team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#F0B90B' }}>Get in Touch</h2>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#848E9C' }}>
                Have questions about Atheer? Our support team is here to help. Reach out through any of the channels below, 
                and we'll get back to you as soon as possible.
              </p>
            </div>

            {/* Contact Methods */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(240,185,11,0.12)' }}>
                  <Mail className="w-5 h-5" style={{ color: '#F0B90B' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Email Support</h3>
                  <p className="text-sm mb-2" style={{ color: '#848E9C' }}>For general inquiries and support</p>
                  <a href="mailto:support@atheer.ccs" className="text-sm font-semibold" style={{ color: '#F0B90B' }}>support@atheer.ccs</a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(3,166,109,0.12)' }}>
                  <MessageCircle className="w-5 h-5" style={{ color: '#03A66D' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Live Chat</h3>
                  <p className="text-sm mb-2" style={{ color: '#848E9C' }}>Available 24/7 for instant support</p>
                  <span className="text-sm font-semibold" style={{ color: '#03A66D' }}>Available in app</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(98,126,234,0.12)' }}>
                  <Globe className="w-5 h-5" style={{ color: '#627EEA' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Social Media</h3>
                  <p className="text-sm mb-2" style={{ color: '#848E9C' }}>Follow us for updates and news</p>
                  <div className="flex gap-3">
                    {SOCIAL_LINKS.map(({ key, label, url }) => (
                      <a key={key} href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold" style={{ color: '#627EEA' }}>
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(130,71,229,0.12)' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#8247E5' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#EAECEF' }}>Headquarters</h3>
                  <p className="text-sm" style={{ color: '#848E9C' }}>
                    CCS Technology<br />
                    Dubai, United Arab Emirates
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <h3 className="text-xl font-bold mb-6" style={{ color: '#EAECEF' }}>Send us a Message</h3>
            
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(3,166,109,0.12)' }}>
                  <Check className="w-8 h-8" style={{ color: '#03A66D' }} />
                </div>
                <h4 className="text-lg font-bold mb-2" style={{ color: '#EAECEF' }}>Message Sent!</h4>
                <p className="text-sm text-center" style={{ color: '#848E9C' }}>Thank you for contacting us. We'll get back to you soon.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2 rounded-lg text-sm font-medium"
                        style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                         placeholder="Your name" required
                         className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                         style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                         placeholder="your@email.com" required
                         className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                         style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                         placeholder="How can we help?"
                         className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                         style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Message *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                            placeholder="Your message..." required rows={5}
                            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                            style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
                </div>
                <button type="submit" disabled={sending}
                        className="w-full py-3 rounded-xl text-sm font-bold text-black gold-gradient disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? 'Sending...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
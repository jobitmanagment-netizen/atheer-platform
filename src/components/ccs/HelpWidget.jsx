import { useState } from 'react';
import { HelpCircle, MessageCircle, Mail, Book, Video, X, TrendingUp, Building2, Shield } from 'lucide-react';

const HELP_CATEGORIES = [
  {
    title: 'Getting Started',
    icon: Book,
    color: '#627EEA',
    articles: [
      'How to create an account',
      'KYC verification guide',
      'Setting up 2FA',
      'Making your first deposit',
    ],
  },
  {
    title: 'Trading',
    icon: TrendingUp,
    color: '#03A66D',
    articles: [
      'How to swap tokens',
      'Futures trading guide',
      'Using trading bots',
      'Copy trading explained',
    ],
  },
  {
    title: 'Banking',
    icon: Building2,
    color: '#F0B90B',
    articles: [
      'SWIFT transfers',
      'SEPA payments',
      'Withdrawal limits',
      'Transaction fees',
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    color: '#CF304A',
    articles: [
      'Account security best practices',
      'Recognizing phishing attempts',
      'Withdrawal whitelisting',
      'API key management',
    ],
  },
];

export default function HelpWidget({ onClose }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center safe-top safe-bottom md:p-4">
      <div className="w-full max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" style={{ color: '#F0B90B' }} />
            <h3 className="text-base font-bold" style={{ color: '#EAECEF' }}>Help Center</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-opacity-80" style={{ background: 'rgba(132,142,156,0.1)' }}>
            <X className="w-4 h-4" style={{ color: '#848E9C' }} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-5 grid grid-cols-3 gap-3">
          <button className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:opacity-80" style={{ background: 'rgba(98,126,234,0.08)' }}>
            <MessageCircle className="w-5 h-5" style={{ color: '#627EEA' }} />
            <span className="text-xs font-medium" style={{ color: '#EAECEF' }}>Live Chat</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:opacity-80" style={{ background: 'rgba(3,166,109,0.08)' }}>
            <Mail className="w-5 h-5" style={{ color: '#03A66D' }} />
            <span className="text-xs font-medium" style={{ color: '#EAECEF' }}>Email Support</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:opacity-80" style={{ background: 'rgba(240,185,11,0.08)' }}>
            <Video className="w-5 h-5" style={{ color: '#F0B90B' }} />
            <span className="text-xs font-medium" style={{ color: '#EAECEF' }}>Video Tutorials</span>
          </button>
        </div>

        {/* Categories */}
        <div className="p-5 pt-0 space-y-3 max-h-80 overflow-y-auto">
          {HELP_CATEGORIES.map(cat => (
            <div key={cat.title} className="rounded-xl p-4" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <div className="flex items-center gap-2 mb-3">
                <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                <h4 className="text-sm font-bold" style={{ color: '#EAECEF' }}>{cat.title}</h4>
              </div>
              <ul className="space-y-2">
                {cat.articles.map(article => (
                  <li key={article}>
                    <button className="text-xs text-left w-full transition-colors hover:text-gold" style={{ color: '#848E9C' }}>
                      {article}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid #2B3139', background: '#151A1F' }}>
          <p className="text-xs text-center" style={{ color: '#848E9C' }}>
            Need personalized help? Contact our 24/7 support team at{' '}
            <a href="mailto:job.it.managment@gmail.com" className="font-bold" style={{ color: '#F0B90B' }}>job.it.managment@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
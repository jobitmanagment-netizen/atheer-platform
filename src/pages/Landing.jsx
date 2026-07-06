import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowRight, Zap, Shield, Globe, TrendingUp, Activity, Lock,
  ChevronRight, MapPin, Phone, Mail, Building2, Users, Award,
  CheckCircle2, Star, BarChart3, Cpu, RefreshCw, Layers
} from 'lucide-react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import PriceTicker from '@/components/ccs/PriceTicker';
import LiveHeroPrices from '@/components/landing/LiveHeroPrices';

/* ─── Company Info ─────────────────────────────────────────── */
const COMPANY = {
  name: 'CCS Technology',
  address: 'North Lebanon, Tripoli',
  phone: '+961 03 429 802',
  email: 'job.it.managment@gmail.com',
  manager: 'Jihad Ahmad Obeid',
  managerTitle: 'General Manager',
  year: '2026',
};

/* ─── Features ─────────────────────────────────────────────── */
const features = [
  { icon: Globe,     color: '#627EEA', title: 'Multi-Chain Swap',       desc: 'Seamlessly swap assets across Ethereum, BNB Chain, Polygon, and Tron networks with best-in-class routing.' },
  { icon: Shield,    color: '#F0B90B', title: 'AI Fraud Detection',     desc: 'Real-time AI risk scoring on every transaction. Enterprise-grade AML compliance with automated monitoring.' },
  { icon: Zap,       color: '#FF0013', title: 'USDT TRC20',             desc: 'Native support for USDT on Tron network with ultra-low fees and instant settlement.' },
  { icon: Lock,      color: '#8247E5', title: 'Institutional Grade',    desc: 'Bank-level security, full audit trails, KYC/AML compliance built for institutional clients.' },
  { icon: Activity,  color: '#03A66D', title: 'Real-Time Analytics',    desc: 'Live market data, portfolio tracking, and AI-powered insights across all supported networks.' },
  { icon: TrendingUp,color: '#FF7A00', title: 'DeFi Liquidity',         desc: 'Provide liquidity and earn up to 24.1% APY on curated pools with transparent reward distribution.' },
  { icon: Cpu,       color: '#627EEA', title: 'Smart Automation',       desc: 'Automated rebalancing, yield optimization, and gas-fee management powered by machine learning.' },
  { icon: RefreshCw, color: '#03A66D', title: 'Instant Settlement',     desc: 'Sub-second transaction finality across all supported chains with real-time confirmation.' },
  { icon: Layers,    color: '#F0B90B', title: 'Aggregated Liquidity',   desc: 'Deep liquidity sourced from 30+ DEX protocols ensuring best execution prices every time.' },
];

/* ─── Chains ────────────────────────────────────────────────── */
const chains = [
  { name: 'Ethereum', symbol: 'ETH',  color: '#627EEA', desc: 'Layer 1 Leader',   volume: '$1.2B daily' },
  { name: 'BNB Chain',symbol: 'BNB',  color: '#F0B90B', desc: 'High Throughput',  volume: '$800M daily' },
  { name: 'Polygon',  symbol: 'MATIC',color: '#8247E5', desc: 'Low Cost L2',      volume: '$320M daily' },
  { name: 'Tron',     symbol: 'TRX',  color: '#FF0013', desc: 'USDT TRC20',       volume: '$620M daily' },
];

/* ─── Stats ─────────────────────────────────────────────────── */
const trustStats = [
  { label: 'Total Value Locked', value: '$93M+',  icon: BarChart3 },
  { label: '24h Volume',         value: '$2.4B+', icon: Activity  },
  { label: 'Active Users',       value: '47K+',   icon: Users     },
  { label: 'Supported Networks', value: '4 Chains',icon: Globe    },
];

/* ─── Why Choose Us ─────────────────────────────────────────── */
const whyUs = [
  { title: 'Licensed & Regulated',      desc: 'Fully compliant with international AML/KYC standards.' },
  { title: 'Military-Grade Encryption', desc: '256-bit AES encryption on all data and transactions.' },
  { title: '99.99% Uptime SLA',         desc: 'Distributed infrastructure with zero single points of failure.' },
  { title: '24/7 Expert Support',       desc: 'Dedicated support team available around the clock.' },
  { title: 'Non-Custodial Option',      desc: 'Keep full control of your assets with our non-custodial mode.' },
  { title: 'Transparent Fees',          desc: 'No hidden fees. Clear pricing with live fee estimation before every trade.' },
];

/* ─── Testimonials ──────────────────────────────────────────── */
const testimonials = [
  { name: 'Mohammed Al-Rashid',  role: 'Head of Treasury, GCC Fund',    text: 'CCS Technology has transformed our cross-border liquidity operations. The AI risk engine alone saved us from 3 potential fraud incidents in Q1.' },
  { name: 'Sarah Chen',         role: 'CTO, AsiaPac Digital Assets',   text: 'Best USDT TRC20 infrastructure in the region. Settlement speeds are unmatched and the compliance tooling is enterprise-ready.' },
  { name: 'Omar Benali',        role: 'DeFi Portfolio Manager',        text: 'The liquidity pool yields are consistently above market average. Transparent, reliable, and the analytics dashboard is exceptional.' },
];

/* ─── How It Works ──────────────────────────────────────────── */
const steps = [
  { step: '01', title: 'Create Account',    desc: 'Register and complete KYC verification in under 5 minutes.' },
  { step: '02', title: 'Connect Wallet',    desc: 'Link your multi-chain wallet or create a new one on any supported network.' },
  { step: '03', title: 'Trade & Earn',      desc: 'Swap tokens, provide liquidity, and monitor your portfolio with AI insights.' },
];

/* ════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitQuickContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSending(true);
    try {
      const res = await ccs.functions.invoke('submitContactMessage', {
        ...contactForm,
        subject: 'Landing page inquiry',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      logger.info('Landing', 'Quick contact submitted', { email: contactForm.email });
      setContactSent(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSent(false), 2500);
    } catch (error) {
      logger.error('Landing', 'Quick contact failed', { error: error?.message || String(error) });
      alert('Failed to send message. Please try again.');
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0B0E11', color: '#EAECEF' }}>

      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300"
           style={{ background: scrolled ? 'rgba(11,14,17,0.98)' : 'rgba(11,14,17,0.92)', backdropFilter: 'blur(16px)', borderBottom: scrolled ? '1px solid rgba(240,185,11,0.25)' : '1px solid #2B3139', boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center gold-gradient">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <span className="text-lg font-bold text-gold">CCS</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(240,185,11,0.1)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>TECHNOLOGY</span>
          </Link>
          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: '#848E9C' }}>
            <a href="#features" className="hover:text-gold transition-colors">Features</a>
            <a href="#chains" className="hover:text-gold transition-colors">Networks</a>
            <a href="#how-it-works" className="hover:text-gold transition-colors">How It Works</a>
            <a href="#contact" className="hover:text-gold transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-80" style={{ color: '#848E9C' }}>
              Login
            </Link>
            <Link to="/login" className="px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 text-black gold-gradient atheer-gold-glow">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Price Ticker ─────────────────────────────────────── */}
      <div className="pt-16">
        <PriceTicker />
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
               style={{ background: 'radial-gradient(ellipse, #F0B90B 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-5"
               style={{ background: 'radial-gradient(ellipse, #627EEA 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Powered by badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
               style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)', color: '#848E9C' }}>
            <Building2 className="w-3 h-3" style={{ color: '#F0B90B' }} />
            Powered by <span className="text-gold font-bold">{COMPANY.name}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
               style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}>
            <Zap className="w-3 h-3" />
            Next-Generation Multi-Chain DeFi Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span style={{ color: '#EAECEF' }}>The Future of</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg, #F0B90B 0%, #FF9900 50%, #F0B90B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cross-Chain Finance
            </span>
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#848E9C' }}>
            Institutional-grade liquidity platform with AI-powered fraud detection, multi-chain swaps, and USDT TRC20 support. Developed by {COMPANY.name} — {COMPANY.address}.
          </p>

          {/* Live market prices */}
          <LiveHeroPrices />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-black gold-gradient atheer-gold-glow transition-all duration-200">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-80"
                  style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}>
              View Demo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Platform Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4" style={{ color: '#EAECEF' }}>
              Enterprise-Grade Features
            </h2>
            <p className="text-lg" style={{ color: '#848E9C' }}>
              Everything you need to operate at institutional scale
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="rounded-xl p-6 transition-all duration-200 hover:scale-[1.02] hover:border-opacity-60 group"
                   style={{ background: '#1E2329', border: `1px solid #2B3139` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110"
                     style={{ background: `${f.color}18` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#EAECEF' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported Chains ─────────────────────────────────── */}
      <section id="chains" className="py-24 px-6" style={{ background: '#151A1F' }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Blockchain Networks</span>
          <h2 className="text-3xl font-bold mt-2 mb-4" style={{ color: '#EAECEF' }}>Supported Networks</h2>
          <p className="mb-12" style={{ color: '#848E9C' }}>Trade seamlessly across the most important blockchain networks</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {chains.map(c => (
              <div key={c.symbol} className="rounded-xl p-6 text-center transition-all duration-200 hover:scale-[1.05]"
                   style={{ background: '#1E2329', border: `1px solid ${c.color}33` }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                     style={{ background: `${c.color}22` }}>
                  <span className="text-2xl font-black" style={{ color: c.color }}>{c.symbol[0]}</span>
                </div>
                <div className="font-bold mb-1" style={{ color: '#EAECEF' }}>{c.name}</div>
                <div className="text-xs mb-2" style={{ color: c.color }}>{c.desc}</div>
                <div className="text-xs font-medium" style={{ color: '#848E9C' }}>{c.volume}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Simple Process</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4" style={{ color: '#EAECEF' }}>How It Works</h2>
          <p className="mb-16" style={{ color: '#848E9C' }}>Start trading in 3 simple steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%-0px)] w-full h-px"
                       style={{ background: 'linear-gradient(90deg, #F0B90B44, transparent)' }} />
                )}
                <div className="rounded-2xl p-8 text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="text-4xl font-black mb-4 text-gold opacity-40">{s.step}</div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#EAECEF' }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#151A1F' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Trust & Security</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4" style={{ color: '#EAECEF' }}>Why Choose CCS Technology?</h2>
            <p style={{ color: '#848E9C' }}>Built with security, compliance, and performance at its core</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyUs.map(w => (
              <div key={w.title} className="flex items-start gap-4 rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
                   style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-gold" />
                <div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: '#EAECEF' }}>{w.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Client Testimonials</span>
            <h2 className="text-3xl font-bold mt-2 mb-4" style={{ color: '#EAECEF' }}>Trusted by Industry Leaders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-xl p-6" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-gold" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#EAECEF' }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                       style={{ background: 'rgba(240,185,11,0.15)', color: '#F0B90B' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: '#848E9C' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ background: '#151A1F', borderTop: '1px solid #2B3139' }}>
        <div className="max-w-2xl mx-auto">
          <Award className="w-12 h-12 mx-auto mb-6 text-gold" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#EAECEF' }}>
            Ready to Trade at Scale?
          </h2>
          <p className="mb-8 text-lg" style={{ color: '#848E9C' }}>
            Join 47,000+ traders and institutions on CCS Technology
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold text-black gold-gradient atheer-gold-glow transition-all duration-200">
            Start Trading Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="py-20 px-6" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Get In Touch</span>
            <h2 className="text-3xl font-bold mt-2 mb-3" style={{ color: '#EAECEF' }}>Contact Us</h2>
            <p style={{ color: '#848E9C' }}>Reach out to our team for enterprise solutions and support</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Company Card */}
            <div className="rounded-2xl p-8" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              {/* Logo + Name */}
              <div className="flex items-center gap-4 mb-8 pb-6" style={{ borderBottom: '1px solid #2B3139' }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center gold-gradient">
                  <Cpu className="w-7 h-7 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black" style={{ color: '#EAECEF' }}>{COMPANY.name}</h3>
                  <p className="text-sm" style={{ color: '#848E9C' }}>Technology Solutions Provider</p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(240,185,11,0.12)' }}>
                    <MapPin className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#848E9C' }}>Address</p>
                    <p className="text-sm font-medium" style={{ color: '#EAECEF' }}>{COMPANY.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(3,166,109,0.12)' }}>
                    <Phone className="w-4 h-4" style={{ color: '#03A66D' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#848E9C' }}>Phone</p>
                    <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`}
                       className="text-sm font-medium transition-colors hover:text-gold" style={{ color: '#EAECEF' }}>
                      {COMPANY.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(98,126,234,0.12)' }}>
                    <Mail className="w-4 h-4" style={{ color: '#627EEA' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#848E9C' }}>Email</p>
                    <a href={`mailto:${COMPANY.email}`}
                       className="text-sm font-medium transition-colors hover:text-gold" style={{ color: '#EAECEF' }}>
                      {COMPANY.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(240,185,11,0.12)' }}>
                    <Award className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#848E9C' }}>General Manager</p>
                    <p className="text-sm font-bold" style={{ color: '#F0B90B' }}>{COMPANY.manager}</p>
                    <p className="text-xs" style={{ color: '#848E9C' }}>{COMPANY.managerTitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="rounded-2xl p-8" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <h3 className="text-lg font-bold mb-6" style={{ color: '#EAECEF' }}>Send a Message</h3>
              <form className="space-y-4" onSubmit={submitQuickContact}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#848E9C' }}>Full Name</label>
                  <input type="text" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name"
                         className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                         style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
                         onFocus={e => e.target.style.borderColor = '#F0B90B'}
                         onBlur={e => e.target.style.borderColor = '#2B3139'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#848E9C' }}>Email Address</label>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} placeholder="your@email.com"
                         className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                         style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
                         onFocus={e => e.target.style.borderColor = '#F0B90B'}
                         onBlur={e => e.target.style.borderColor = '#2B3139'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#848E9C' }}>Message</label>
                  <textarea rows={4} value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))} placeholder="How can we help you?"
                            className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all resize-none"
                            style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
                            onFocus={e => e.target.style.borderColor = '#F0B90B'}
                            onBlur={e => e.target.style.borderColor = '#2B3139'} />
                </div>
                <button type="submit" disabled={contactSending || contactSent}
                   className="block w-full text-center px-6 py-3 rounded-lg text-sm font-bold text-black gold-gradient atheer-gold-glow transition-all duration-200 disabled:opacity-60">
                  {contactSending ? 'Sending...' : contactSent ? 'Message Sent' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="px-6 pt-14 pb-8" style={{ background: '#0D1117', borderTop: '1px solid #2B3139' }}>
        <div className="max-w-6xl mx-auto">
          {/* Footer Top */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 pb-10" style={{ borderBottom: '1px solid #2B3139' }}>
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center gold-gradient">
                  <Zap className="w-4 h-4 text-black" />
                </div>
                <span className="font-bold text-gold text-lg">CCS TECHNOLOGY</span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#848E9C' }}>
                Next-generation multi-chain DeFi platform with AI-powered risk management. Built for institutions, trusted by traders.
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#848E9C' }}>
                <Building2 className="w-3.5 h-3.5 text-gold" />
                <span>Developed by <strong className="text-gold">{COMPANY.name}</strong></span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: '#EAECEF' }}>Platform</h4>
              <ul className="space-y-2.5">
                {['Dashboard', 'Swap', 'Liquidity', 'History', 'Profile'].map(p => (
                  <li key={p}>
                    <Link to={`/${p.toLowerCase()}`}
                          className="text-sm transition-colors hover:text-gold"
                          style={{ color: '#848E9C' }}>
                      {p}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: '#EAECEF' }}>Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm" style={{ color: '#848E9C' }}>
                  <Building2 className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" />
                  {COMPANY.name}
                </li>
                <li className="flex items-start gap-2.5 text-sm" style={{ color: '#848E9C' }}>
                  <MapPin className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" />
                  {COMPANY.address}
                </li>
                <li className="flex items-start gap-2.5 text-sm" style={{ color: '#848E9C' }}>
                  <Phone className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" />
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:text-gold transition-colors">{COMPANY.phone}</a>
                </li>
                <li className="flex items-start gap-2.5 text-sm" style={{ color: '#848E9C' }}>
                  <Mail className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" />
                  <a href={`mailto:${COMPANY.email}`} className="hover:text-gold transition-colors break-all">{COMPANY.email}</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ color: '#4B5563' }}>
            <p>© {COMPANY.year} CCS Technology. All rights reserved. Not financial advice.</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Developed by</span>
              <span className="font-bold text-gold">{COMPANY.name}</span>
              <span>·</span>
              <span>{COMPANY.managerTitle}:</span>
              <span className="font-semibold" style={{ color: '#848E9C' }}>{COMPANY.manager}</span>
              <span>·</span>
              <span>HTML Programming Architecture by</span>
              <span className="font-semibold text-gold">Fatmi Alamedine</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
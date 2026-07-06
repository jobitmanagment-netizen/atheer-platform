import { Link } from 'react-router-dom';
import { Zap, Shield, TrendingUp, Globe, Users, Award } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen" style={{ background: '#0B0E11' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1E2329' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center gold-gradient">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-black" style={{ color: '#EAECEF' }}>About Atheer</h1>
              <p className="text-sm mt-1" style={{ color: '#848E9C' }}>Powered by CCS Technology</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#F0B90B' }}>What is Atheer?</h2>
          <div className="space-y-4 text-base leading-relaxed" style={{ color: '#848E9C' }}>
            <p>
              Atheer is a next-generation cryptocurrency trading and investment platform designed for both beginner and professional traders. 
              Built with cutting-edge technology and enterprise-grade security, Atheer provides comprehensive access to global crypto markets 
              with advanced trading tools, AI-powered insights, and automated trading strategies.
            </p>
            <p>
              Our platform offers spot trading, futures contracts with up to 125x leverage, automated trading bots, copy trading features, 
              staking and yield farming opportunities, and integrated global banking services. Whether you're looking to swap tokens, 
              provide liquidity, or execute complex trading strategies, Atheer delivers a seamless and secure experience across all major 
              blockchain networks including Ethereum, BNB Chain, Polygon, Tron, Solana, and more.
            </p>
          </div>
        </section>

        {/* Who It's For */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#F0B90B' }}>Who is Atheer For?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Users,
                title: 'Retail Traders',
                desc: 'Individual investors seeking a user-friendly platform to buy, sell, and manage their cryptocurrency portfolios with confidence.'
              },
              {
                icon: TrendingUp,
                title: 'Professional Traders',
                desc: 'Experienced traders who need advanced charting, technical indicators, futures trading, and automated strategies to maximize returns.'
              },
              {
                icon: Shield,
                title: 'Security-Conscious Users',
                desc: 'Users who prioritize safety with military-grade encryption, multi-factor authentication, and comprehensive threat monitoring.'
              },
              {
                icon: Award,
                title: 'VIP Traders',
                desc: 'High-volume traders who benefit from our tiered rewards program with cashback, fee discounts, and exclusive perks.'
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.12)' }}>
                    <Icon className="w-5 h-5" style={{ color: '#F0B90B' }} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>{title}</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#848E9C' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Built By */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#F0B90B' }}>Built by CCS Technology</h2>
          <div className="space-y-4 text-base leading-relaxed" style={{ color: '#848E9C' }}>
            <p>
              Atheer is developed and maintained by CCS Technology, a leading fintech innovation company specializing in blockchain 
              infrastructure and cryptocurrency trading solutions. Founded by Jihad Ahmad Obeid, CCS Technology combines deep expertise 
              in financial markets, artificial intelligence, and cybersecurity to deliver world-class trading platforms.
            </p>
            <p>
              Our team consists of experienced software engineers, quantitative analysts, security researchers, and financial experts 
              dedicated to building the most advanced and secure cryptocurrency trading ecosystem. We are committed to providing 
              institutional-grade technology accessible to traders worldwide, with continuous innovation in AI-driven trading signals, 
              risk management, and regulatory compliance.
            </p>
            <div className="flex items-center gap-3 mt-6 p-4 rounded-xl" style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.2)' }}>
              <Globe className="w-5 h-5" style={{ color: '#F0B90B' }} />
              <div>
                <div className="text-sm font-bold" style={{ color: '#EAECEF' }}>Global Reach</div>
                <div className="text-xs" style={{ color: '#848E9C' }}>Serving traders worldwide with multi-language support and 24/7 customer service</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="flex gap-4 pt-6">
          <Link to="/register" className="px-6 py-3 rounded-xl text-sm font-bold text-black gold-gradient">
            Get Started
          </Link>
          <Link to="/contact" className="px-6 py-3 rounded-xl text-sm font-medium"
                style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#848E9C' }}>
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
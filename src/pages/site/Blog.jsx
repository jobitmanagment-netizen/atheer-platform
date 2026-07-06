import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { BLOG_POSTS, pick } from '@/lib/site-data';
import { PageHeader } from './Services';
import Seo from '@/components/site/Seo';

export default function Blog() {
  const { t, lang, isRTL } = useLanguage();
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <Seo title={`${t('blog.title')} — CCS Technology`} description={t('blog.subtitle')} />
      <PageHeader title={t('blog.title')} subtitle={t('blog.subtitle')} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group block h-full rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}
              >
                <div className="h-32 flex items-center px-6" style={{ background: `linear-gradient(135deg, ${post.color}22, transparent)` }}>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: `${post.color}22`, color: post.color }}>
                    {pick(post.category, lang)}
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-lg font-bold mb-2 group-hover:text-gold transition-colors" style={{ color: '#EAECEF' }}>
                    {pick(post.title, lang)}
                  </h2>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#848E9C' }}>{pick(post.excerpt, lang)}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#848E9C' }}>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{post.date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.readMin} {t('blog.minRead')}</span>
                    <ArrowRight className={`w-4 h-4 ms-auto text-gold ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

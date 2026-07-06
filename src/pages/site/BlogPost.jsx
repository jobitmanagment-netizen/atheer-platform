import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { BLOG_POSTS, pick } from '@/lib/site-data';
import PageNotFound from '@/lib/PageNotFound';
import Seo from '@/components/site/Seo';

export default function BlogPost() {
  const { slug } = useParams();
  const { t, lang, isRTL } = useLanguage();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) return <PageNotFound />;

  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div>
      <Seo title={`${pick(post.title, lang)} — CCS Technology`} description={pick(post.excerpt, lang)} />

      <div className="border-b" style={{ borderColor: '#1E2329', background: `linear-gradient(135deg, ${post.color}18, #0A0C0F)` }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:text-gold" style={{ color: '#848E9C' }}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('blog.backToBlog')}
          </Link>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: `${post.color}22`, color: post.color }}>
            {pick(post.category, lang)}
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-black leading-tight" style={{ color: '#EAECEF' }}>{pick(post.title, lang)}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs" style={{ color: '#848E9C' }}>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{t('blog.by')} {post.author}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{post.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.readMin} {t('blog.minRead')}</span>
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-lg leading-relaxed mb-6 font-medium" style={{ color: '#EAECEF' }}>{pick(post.excerpt, lang)}</p>
        <p className="text-base leading-loose" style={{ color: '#848E9C' }}>{pick(post.body, lang)}</p>
      </article>

      {related.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <h2 className="text-xl font-bold mb-5 text-gold">{t('blog.related')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="block p-5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                <span className="text-[11px] font-bold" style={{ color: p.color }}>{pick(p.category, lang)}</span>
                <h3 className="mt-1 text-sm font-bold" style={{ color: '#EAECEF' }}>{pick(p.title, lang)}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

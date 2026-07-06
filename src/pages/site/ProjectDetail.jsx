import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PROJECTS, SERVICES, pick } from '@/lib/site-data';
import PageNotFound from '@/lib/PageNotFound';
import Seo from '@/components/site/Seo';

export default function ProjectDetail() {
  const { id } = useParams();
  const { t, lang, isRTL } = useLanguage();
  const project = PROJECTS.find((p) => p.id === id);

  if (!project) return <PageNotFound />;

  const category = SERVICES.find((s) => s.id === project.category);
  const isInternal = project.liveUrl && project.liveUrl.startsWith('/');

  return (
    <div>
      <Seo title={`${pick(project.title, lang)} — CCS Technology`} description={pick(project.short, lang)} />

      {/* Hero banner */}
      <div className="border-b" style={{ borderColor: '#1E2329', background: `linear-gradient(135deg, ${project.color}18, #0A0C0F)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:text-gold" style={{ color: '#848E9C' }}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('projects.backToProjects')}
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: project.color }}>{pick(category?.title, lang)}</span>
          <h1 className="mt-2 text-4xl md:text-5xl font-black" style={{ color: '#EAECEF' }}>{pick(project.title, lang)}</h1>
          <p className="mt-3 text-lg" style={{ color: '#848E9C' }}>{pick(project.short, lang)}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gold">{t('projects.overview')}</h2>
          <p className="text-base leading-relaxed" style={{ color: '#848E9C' }}>{pick(project.overview, lang)}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gold">{t('projects.technologies')}</h2>
          <div className="flex flex-wrap gap-2.5">
            {project.tech.map((tech) => (
              <span key={tech} className="px-3.5 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
                {tech}
              </span>
            ))}
          </div>
        </section>

        {(project.liveUrl || project.repoUrl) && (
          <div className="flex flex-wrap gap-4 pt-2">
            {project.liveUrl && (
              isInternal ? (
                <Link to={project.liveUrl} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-black gold-gradient">
                  {t('projects.liveDemo')}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              ) : (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-black gold-gradient">
                  {t('projects.liveDemo')}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )
            )}
            {project.repoUrl && (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}>
                <Github className="w-4 h-4" style={{ color: '#F0B90B' }} />
                {t('projects.sourceCode')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

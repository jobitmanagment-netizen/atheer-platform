import { SOCIAL_LINKS } from '@/lib/site-data';

export default function SocialLinks({ size = 'md', className = '' }) {
  const box = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL_LINKS.map(({ key, label, icon: Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={`${box} rounded-lg flex items-center justify-center transition-all hover:-translate-y-0.5`}
          style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#F0B90B')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2B3139')}
        >
          <Icon className={icon} style={{ color: '#848E9C' }} />
        </a>
      ))}
    </div>
  );
}

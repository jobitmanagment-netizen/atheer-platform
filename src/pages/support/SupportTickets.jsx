import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '../site/Services';
import TicketsPanel from '@/components/site/TicketsPanel';
import { isAdmin } from '@/lib/crm';
import Seo from '@/components/site/Seo';

export default function SupportTickets() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const admin = isAdmin(user);

  return (
    <div>
      <Seo title={`${t('support.title')} — CCS Technology`} description={t('support.subtitle')} />
      <PageHeader title={t('support.title')} subtitle={admin ? t('support.subtitleAdmin') : t('support.subtitle')} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <TicketsPanel scopeEmail={user?.email} isAdmin={admin} />
      </div>
    </div>
  );
}

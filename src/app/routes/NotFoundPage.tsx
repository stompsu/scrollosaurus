import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLangPath } from '@/lib/lang';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const to = useLangPath();
  return (
    <article className="flex flex-col gap-4">
      <title>{t('site.pageTitle', { page: t('notFound.title') })}</title>
      <h1 className="font-display text-3xl">{t('notFound.heading')}</h1>
      <p>{t('notFound.text')}</p>
      <Link to={to('/')} className="text-accent underline">
        {t('notFound.back')}
      </Link>
    </article>
  );
}

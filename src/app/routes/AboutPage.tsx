import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <article className="flex max-w-prose flex-col gap-4">
      <title>{t('site.pageTitle', { page: t('about.title') })}</title>
      <h1 className="font-display text-3xl">{t('about.title')}</h1>
      <p>{t('about.p1')}</p>
      <p>{t('about.p2')}</p>
    </article>
  );
}

import { tr } from '@/lib/i18n';

export default function AboutPage() {
  return (
    <article className="flex max-w-prose flex-col gap-4">
      <title>{tr('site.pageTitle', { page: tr('about.title') })}</title>
      <h1 className="font-display text-3xl">{tr('about.title')}</h1>
      <p>{tr('about.p1')}</p>
      <p>{tr('about.p2')}</p>
    </article>
  );
}

import { Link } from 'react-router';
import { tr } from '@/lib/i18n';
import { useLangPath } from '@/lib/lang';

export default function NotFoundPage() {
  const to = useLangPath();
  return (
    <article className="flex flex-col gap-4">
      <title>{tr('site.pageTitle', { page: tr('notFound.title') })}</title>
      <h1 className="font-display text-3xl">{tr('notFound.heading')}</h1>
      <p>{tr('notFound.text')}</p>
      <Link to={to('/')} className="text-accent underline">
        {tr('notFound.back')}
      </Link>
    </article>
  );
}

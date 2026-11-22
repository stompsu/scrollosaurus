import { Link } from 'react-router';
import { ImageContext, ImageCredit, SpeciesPicture } from '@/components/ui/SpeciesPicture';
import { geologicTime } from '@/lib/geologic-time';
import { tr } from '@/lib/i18n';
import { useLang } from '@/lib/lang';
import { langPath, localize } from '@/lib/locale';
import { species } from '@/lib/species';

export default function CreditsPage() {
  const lang = useLang();
  const { chart } = geologicTime;
  const credited = [...species]
    .filter((s) => s.images.length > 0)
    .sort((a, b) => a.genus.localeCompare(b.genus));
  const without = species.filter((s) => s.images.length === 0);
  return (
    // overflow-wrap:anywhere lets long URLs/DOIs in credits wrap at 320 px (WCAG 1.4.10).
    <article className="flex max-w-prose min-w-0 flex-col gap-4 [overflow-wrap:anywhere]">
      <title>{tr('site.pageTitle', { page: tr('credits.title') })}</title>
      <h1 className="font-display text-3xl">{tr('credits.title')}</h1>
      <h2 className="font-display text-xl">{tr('credits.data')}</h2>
      <p>
        {chart.name} {chart.version}, {chart.publisher}.{' '}
        <a className="text-accent underline" href={chart.url}>
          {chart.url}
        </a>{' '}
        ({chart.license}). {chart.citation}
      </p>
      <p>{tr('credits.dataNote')}</p>

      <h2 className="font-display text-xl">{tr('credits.images')}</h2>
      <p>{tr('credits.imagesNote')}</p>
      <ul className="sc-credits-list" data-testid="image-credits">
        {credited.flatMap((s) =>
          s.images.map((image) => (
            <li key={image.commonsFile} className="sc-credits-item">
              <SpeciesPicture image={image} sizes="5rem" decorative />
              <div>
                <p>
                  <Link className="text-accent underline" to={langPath(`/species/${s.slug}`, lang)}>
                    <i>{s.genus}</i>
                  </Link>
                  : {localize(image.alt)}
                </p>
                <p className="text-sm">
                  <ImageContext image={image} />
                </p>
                <ImageCredit image={image} />
              </div>
            </li>
          )),
        )}
      </ul>
      {without.length > 0 && (
        <p className="text-text-muted text-sm">
          {tr('credits.without')}
          {without.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && ', '}
              <i>{s.genus}</i>
            </span>
          ))}
          .
        </p>
      )}
    </article>
  );
}

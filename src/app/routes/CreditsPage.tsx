import { Link } from 'react-router';
import { ImageCredit, SpeciesPicture } from '@/components/ui/SpeciesPicture';
import { geologicTime } from '@/lib/geologic-time';
import { species } from '@/lib/species';

export default function CreditsPage() {
  const { chart } = geologicTime;
  const credited = [...species]
    .filter((s) => s.images.length > 0)
    .sort((a, b) => a.genus.localeCompare(b.genus));
  const without = species.filter((s) => s.images.length === 0);
  return (
    // overflow-wrap:anywhere lets long URLs/DOIs in credits wrap at 320 px (WCAG 1.4.10).
    <article className="flex max-w-prose min-w-0 flex-col gap-4 [overflow-wrap:anywhere]">
      <title>Credits · Scrollosaurus</title>
      <h1 className="font-display text-3xl">Credits</h1>
      <h2 className="font-display text-xl">Data</h2>
      <p>
        {chart.name} {chart.version}, {chart.publisher}.{' '}
        <a className="text-accent underline" href={chart.url}>
          {chart.url}
        </a>{' '}
        ({chart.license}). {chart.citation}
      </p>
      <p>
        Every species fact links to its sources in that species’ details. Data comes mainly from
        peer-reviewed papers, museums and the Paleobiology Database.
      </p>

      <h2 className="font-display text-xl">Images</h2>
      <p>
        All images come from Wikimedia Commons, under the licence shown with each one. They are
        resized and converted for this site; the licence of each original applies to its copies.
      </p>
      <ul className="sc-credits-list" data-testid="image-credits">
        {credited.flatMap((s) =>
          s.images.map((image) => (
            <li key={image.commonsFile} className="sc-credits-item">
              <SpeciesPicture image={image} sizes="5rem" decorative />
              <div>
                <p>
                  <Link className="text-accent underline" to={`/species/${s.slug}`}>
                    <i>{s.genus}</i>
                  </Link>
                  : {image.alt}
                </p>
                <ImageCredit image={image} />
              </div>
            </li>
          )),
        )}
      </ul>
      {without.length > 0 && (
        <p className="text-text-muted text-sm">
          No suitable freely licensed image yet for:{' '}
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

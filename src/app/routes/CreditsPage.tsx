import { geologicTime } from '@/lib/geologic-time';

export default function CreditsPage() {
  const { chart } = geologicTime;
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
      <h2 className="font-display text-xl">Images</h2>
      <p>Image credits will be listed here once species images are added.</p>
    </article>
  );
}

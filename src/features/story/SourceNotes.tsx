import { useTranslation } from 'react-i18next';
import type { Story } from '@/lib/schemas/stories';

type Source = Story['sources'][number];

/** A compact "Sources:" list for a story step or timeline note. */
export function SourceNotes({ sources }: { sources: readonly Source[] }) {
  const { t } = useTranslation();
  if (sources.length === 0) return null;
  return (
    <p className="sc-note">
      {t('tour.sources')}{' '}
      {sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 && '; '}
          <a href={s.url} rel="noreferrer">
            {s.authors
              ? `${s.authors.split(',')[0] ?? s.authors}${s.authors.includes(',') ? ` ${t('tour.etAl')}` : ''}`
              : s.title}
            {s.year !== undefined && ` (${String(s.year)})`}
          </a>
        </span>
      ))}
    </p>
  );
}

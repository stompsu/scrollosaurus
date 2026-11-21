import type { Story } from '@/lib/schemas/stories';

type Source = Story['sources'][number];

/** A compact "Sources:" list for a story step or timeline note. */
export function SourceNotes({ sources }: { sources: readonly Source[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="sc-note">
      Sources:{' '}
      {sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 && '; '}
          <a href={s.url} rel="noreferrer">
            {s.authors
              ? `${s.authors.split(',')[0] ?? s.authors}${s.authors.includes(',') ? ' et al.' : ''}`
              : s.title}
            {s.year !== undefined && ` (${String(s.year)})`}
          </a>
        </span>
      ))}
    </p>
  );
}

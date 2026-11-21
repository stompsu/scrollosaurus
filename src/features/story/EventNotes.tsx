import { formatMaRounded, unitById } from '@/lib/geologic-time';
import type { Events } from '@/lib/schemas/stories';
import { SourceNotes } from './SourceNotes';

/**
 * The notes pinned to the end of the Cretaceous: the extinction and "birds are living dinosaurs".
 * The page shows them once the view reaches the last stage before the boundary.
 */
export function EventNotes({ events }: { events: Events }) {
  const first = events.events[0];
  const label = first
    ? `${formatMaRounded(unitById(first.atTopOf).topMa)} million years ago`
    : 'Timeline notes';
  return (
    <section className="sc-events" aria-label={label} data-testid="event-notes">
      {events.events.map((e) => (
        <article key={e.id} className="sc-event" data-event={e.id}>
          <h2 className="sc-event-title">{e.title.en}</h2>
          <p>{e.text.en}</p>
          <SourceNotes sources={events.sources.filter((s) => e.sourceIds.includes(s.id))} />
        </article>
      ))}
    </section>
  );
}

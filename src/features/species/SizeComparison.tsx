import { formatRange } from '@/lib/labels';
import type { Species } from '@/lib/schemas/species';

/** Reference figure for the comparison: an adult human, as the project brief specifies. */
const HUMAN_M = 1.8;

interface Bar {
  label: string;
  value: readonly [number, number];
  reference?: boolean;
}

/**
 * Length (or, for flying reptiles with no recorded length, wingspan) beside a 1.8 m adult human.
 * A range is drawn as a solid bar to the low value and a hatched extension to the high value.
 * Drawn silhouettes come in Phase 5.
 */
export function SizeComparison({ genus, size }: { genus: string; size: Species['size'] }) {
  const measure = size.lengthM
    ? { what: 'Length', value: size.lengthM.value }
    : size.wingspanM
      ? { what: 'Wingspan', value: size.wingspanM.value }
      : undefined;
  if (!measure) return null;

  const bars: Bar[] = [
    { label: genus, value: measure.value },
    { label: 'Adult human', value: [HUMAN_M, HUMAN_M], reference: true },
  ];
  const max = Math.max(measure.value[1], HUMAN_M);
  const pct = (m: number) => `${String((m / max) * 100)}%`;
  const what = measure.what.toLowerCase();
  const description = `${measure.what} of ${genus}, ${formatRange(measure.value, 'm')}, compared with a ${String(HUMAN_M)} m adult human.`;

  return (
    <figure className="sc-size">
      <figcaption className="sc-drawer-h3">Size compared with a person</figcaption>
      <div role="img" aria-label={description} className="sc-size-chart">
        {bars.map((b) => (
          <div key={b.label} className="sc-size-row">
            <span className="sc-size-label">{b.reference ? b.label : <i>{b.label}</i>}</span>
            <span className="sc-size-track">
              <span
                className={`sc-size-bar${b.reference ? ' sc-size-bar--ref' : ''}`}
                style={{ width: pct(b.value[0]) }}
              />
              {b.value[1] > b.value[0] && (
                <span
                  className="sc-size-bar sc-size-bar--range"
                  style={{ left: pct(b.value[0]), width: pct(b.value[1] - b.value[0]) }}
                />
              )}
            </span>
            <span className="sc-size-value">{formatRange(b.value, 'm')}</span>
          </div>
        ))}
      </div>
      <p className="sc-note">
        Bars show {what}; the person is {HUMAN_M} m tall.
        {measure.value[1] > measure.value[0] && ' The lighter part spans the range of estimates.'}
      </p>
    </figure>
  );
}

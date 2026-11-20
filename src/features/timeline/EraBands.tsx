import type { CSSProperties } from 'react';
import { durationMa, formatMa, unitsByRank } from '@/lib/geologic-time';

const BAND_COLOR: Record<string, string> = {
  triassic: 'var(--sc-triassic)',
  jurassic: 'var(--sc-jurassic)',
  cretaceous: 'var(--sc-cretaceous)',
};

/**
 * Static period bands sized by duration. Horizontal (older → left) on wide screens,
 * vertical (older → top) on narrow ones. Placeholder for the Phase 2 interactive timeline.
 */
export function EraBands() {
  const periods = unitsByRank('period');
  const total = periods.reduce((sum, p) => sum + durationMa(p), 0);

  return (
    <ol
      // Tailwind's preflight removes list styling, which makes Safari/VoiceOver drop the list role.
      role="list"
      aria-label="Periods of the Mesozoic era, oldest first"
      className="flex min-h-[70vh] w-full flex-col overflow-hidden rounded-lg md:min-h-[50vh] md:flex-row"
    >
      {periods.map((period) => {
        const style: CSSProperties = {
          flexGrow: durationMa(period) / total,
          flexBasis: 0,
          backgroundColor: BAND_COLOR[period.id] ?? 'var(--sc-surface)',
        };
        return (
          <li
            key={period.id}
            data-testid={`band-${period.id}`}
            style={style}
            className="text-on-band flex flex-col justify-end p-4 md:p-6"
          >
            <span className="font-display text-2xl md:text-3xl">{period.name}</span>
            <span className="text-sm opacity-90">
              {formatMa(period.baseMa)}–{formatMa(period.topMa)} million years ago
            </span>
          </li>
        );
      })}
    </ol>
  );
}

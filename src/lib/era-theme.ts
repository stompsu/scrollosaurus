import { unitById, unitsByRank } from './geologic-time';
import type { TimeWindow } from './view-state';

const PERIODS = unitsByRank('period');
const CRETACEOUS = unitById('cretaceous');
/** The last stage of the Cretaceous (the Maastrichtian), read from the data, not hard-coded. */
const LAST_STAGE = unitsByRank('stage').find((u) => u.topMa === CRETACEOUS.topMa);

export interface EraTheme {
  /** The period the middle of the view falls in. */
  period: string;
  /** 0–1: how far the Cretaceous tint has faded to ash, across the last stage before 66 Ma. */
  ash: number;
}

export function eraThemeFor(window: TimeWindow): EraTheme {
  const first = PERIODS[0];
  const last = PERIODS[PERIODS.length - 1];
  const lo = last?.topMa ?? 0;
  const hi = first?.baseMa ?? Infinity;
  const centre = Math.min(hi, Math.max(lo, (window.startMa + window.endMa) / 2));
  const period =
    PERIODS.find((p) => centre <= p.baseMa && centre >= p.topMa)?.id ?? first?.id ?? 'triassic';
  let ash = 0;
  if (period === CRETACEOUS.id && LAST_STAGE) {
    const span = LAST_STAGE.baseMa - LAST_STAGE.topMa;
    ash = Math.min(1, Math.max(0, (LAST_STAGE.baseMa - centre) / span));
  }
  return { period, ash };
}

/** The CSS value for `--sc-era`: the period's token, mixed towards ash near the extinction. */
export function eraColor({ period, ash }: EraTheme): string {
  const pct = Math.round(ash * 100);
  return pct === 0
    ? `var(--sc-${period})`
    : `color-mix(in srgb, var(--sc-${period}) ${String(100 - pct)}%, var(--sc-ash))`;
}

/** Whether a window reaches into the last stage of the Cretaceous, before the extinction. */
export function reachesEndCretaceous(window: TimeWindow): boolean {
  return LAST_STAGE !== undefined && window.endMa < LAST_STAGE.baseMa;
}

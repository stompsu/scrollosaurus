import rawGeologicTime from '../../data/geologic-time.json';
import type { GeologicRank, GeologicTime, GeologicUnit } from './schemas/geologic-time';

/**
 * Validated at build time by `pnpm validate:data` (which fails the build), so the app trusts
 * the JSON and doesn't ship Zod to the browser for it.
 */
export const geologicTime = rawGeologicTime as GeologicTime;

export function unitsByRank(rank: GeologicRank): GeologicUnit[] {
  return geologicTime.units.filter((u) => u.rank === rank).sort((a, b) => b.baseMa - a.baseMa);
}

export function durationMa(unit: GeologicUnit): number {
  return unit.baseMa - unit.topMa;
}

/** Formats an age for display, e.g. 251.902 → "251.9", 66 → "66". */
export function formatMa(ma: number): string {
  return Number.isInteger(ma) ? String(ma) : ma.toFixed(1).replace(/\.0$/, '');
}

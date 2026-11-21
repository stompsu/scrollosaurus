import { formatMa } from '@/lib/geologic-time';
import type { GeologicUnit } from '@/lib/schemas/geologic-time';

/** One edge between geologic units, with the chart's uncertainty or approximate flag. */
export interface Boundary {
  ma: number;
  uncertaintyMa?: number;
  approximate?: boolean;
}

/**
 * Formats an uncertainty with two significant figures, so 0.024 stays "0.024" instead of rounding
 * to 0 as `formatMa` would.
 */
export function formatUncertainty(ma: number): string {
  return String(Number(ma.toPrecision(2)));
}

/** "~237" for approximate boundaries, "201.4 ±0.2" where the chart gives an uncertainty. */
export function formatBoundary(b: Boundary): string {
  if (b.approximate) return `~${formatMa(b.ma)}`;
  if (b.uncertaintyMa !== undefined && b.uncertaintyMa > 0) {
    return `${formatMa(b.ma)} ±${formatUncertainty(b.uncertaintyMa)}`;
  }
  return formatMa(b.ma);
}

/** Spoken form of a boundary, e.g. "about 237" or "201.4 plus or minus 0.2". */
export function describeBoundary(b: Boundary): string {
  if (b.approximate) return `about ${formatMa(b.ma)}`;
  if (b.uncertaintyMa !== undefined && b.uncertaintyMa > 0) {
    return `${formatMa(b.ma)} plus or minus ${formatUncertainty(b.uncertaintyMa)}`;
  }
  return formatMa(b.ma);
}

/** The boundaries of contiguous units sorted oldest first: each base, then the last top. */
export function boundariesOf(units: readonly GeologicUnit[]): Boundary[] {
  const out: Boundary[] = [];
  const push = (ma: number, uncertaintyMa?: number, approximate?: boolean) => {
    const b: Boundary = { ma };
    if (uncertaintyMa !== undefined) b.uncertaintyMa = uncertaintyMa;
    if (approximate) b.approximate = true;
    out.push(b);
  };
  units.forEach((u) => {
    push(u.baseMa, u.baseUncertaintyMa, u.baseApproximate);
  });
  const last = units[units.length - 1];
  if (last) push(last.topMa, last.topUncertaintyMa, last.topApproximate);
  return out;
}

/** Label candidates for a band, longest first. The empty string means "no label". */
export function bandLabelCandidates(unit: GeologicUnit): string[] {
  const { name } = unit;
  switch (unit.rank) {
    case 'era':
      return [name, ''];
    case 'epoch': {
      const [first = name] = name.split(' ');
      return [name, first, `${first.charAt(0)}.`, ''];
    }
    case 'period':
    case 'stage':
      return [name, `${name.slice(0, 3)}.`, ''];
  }
}

/** The first candidate that fits in `availablePx`, measured with `measure`. */
export function pickLabel(
  candidates: readonly string[],
  availablePx: number,
  measure: (text: string) => number,
): string {
  return candidates.find((c) => c === '' || measure(c) <= availablePx) ?? '';
}

/**
 * Thins boundary labels so they don't collide: walking oldest first, a label is kept only if it
 * starts at least `gapPx` after the previous kept label ends. Labels are centred on `positions`.
 */
export function thinLabels(
  positions: readonly number[],
  widths: readonly number[],
  gapPx: number,
): boolean[] {
  let lastEnd = -Infinity;
  return positions.map((p, i) => {
    const half = (widths[i] ?? 0) / 2;
    if (p - half < lastEnd + gapPx) return false;
    lastEnd = p + half;
    return true;
  });
}

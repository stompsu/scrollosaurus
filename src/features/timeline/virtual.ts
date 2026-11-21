import type { MaRange } from './scale';

export interface TimeRanged {
  startMa: number;
  endMa: number;
  startUncertaintyMa?: number;
  endUncertaintyMa?: number;
}

/** Widens a window by `fraction` of its span on each side (1 = one viewport of buffer). */
export function bufferedWindow(range: MaRange, fraction = 1): MaRange {
  const pad = (range.startMa - range.endMa) * fraction;
  return { startMa: range.startMa + pad, endMa: range.endMa - pad };
}

/** Whether an item's range, whiskers included, overlaps the window. */
export function overlapsWindow(item: TimeRanged, range: MaRange): boolean {
  const older = item.startMa + (item.startUncertaintyMa ?? 0);
  const younger = item.endMa - (item.endUncertaintyMa ?? 0);
  return older >= range.endMa && younger <= range.startMa;
}

/** Items to render: those overlapping the window. Keeps input order. */
export function itemsInWindow<T extends TimeRanged>(items: readonly T[], range: MaRange): T[] {
  return items.filter((item) => overlapsWindow(item, range));
}

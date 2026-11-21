import type { SpeciesIndexEntry } from './species-index';

export interface Contemporary {
  item: SpeciesIndexEntry;
  /** Length of the shared stretch of time, Ma. */
  overlapMa: number;
}

/**
 * Species whose time ranges overlap `target`'s, longest shared stretch first. This uses the
 * recorded first and last appearances only: living at the same time does not mean living in the
 * same place, and the UI says so.
 */
export function livedAlongside(
  target: SpeciesIndexEntry,
  all: readonly SpeciesIndexEntry[],
): Contemporary[] {
  return all
    .filter((s) => s.slug !== target.slug)
    .map((item) => ({
      item,
      overlapMa: Math.min(target.startMa, item.startMa) - Math.max(target.endMa, item.endMa),
    }))
    .filter((c) => c.overlapMa > 0)
    .sort((a, b) => b.overlapMa - a.overlapMa || a.item.genus.localeCompare(b.item.genus));
}

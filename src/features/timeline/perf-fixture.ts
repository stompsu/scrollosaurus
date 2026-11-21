import { unitById } from '@/lib/geologic-time';
import type { SpeciesIndexEntry } from '@/lib/species-index';

/**
 * Performance-test fixture, never shipped: the seed dinosaurs repeated to `count` items with
 * unique slugs and small time offsets (within ±1.5 Ma, kept inside the Mesozoic). These are not
 * real ranges; they exist only to load the timeline with 300 markers. Only `pnpm perf` builds
 * (VITE_PERF_FIXTURE=1) include this module.
 */
export function buildPerfFixture(
  seed: readonly SpeciesIndexEntry[],
  count = 300,
): SpeciesIndexEntry[] {
  const mesozoic = unitById('mesozoic');
  const dinosaurs = seed.filter((s) => s.isDinosaur);
  if (dinosaurs.length === 0) return [];
  const out: SpeciesIndexEntry[] = [];
  for (let i = 0; out.length < count; i++) {
    const src = dinosaurs[i % dinosaurs.length];
    if (!src) break;
    const copy = Math.floor(i / dinosaurs.length);
    if (copy === 0) {
      out.push(src);
      continue;
    }
    let shift = (((copy * 7) % 11) - 5) * 0.3;
    if (src.endMa + shift < mesozoic.topMa) shift = mesozoic.topMa - src.endMa;
    if (src.startMa + shift > mesozoic.baseMa) shift = mesozoic.baseMa - src.startMa;
    out.push({
      ...src,
      slug: `${src.slug}-perf-${copy}`,
      startMa: src.startMa + shift,
      endMa: src.endMa + shift,
    });
  }
  return out.sort((a, b) => b.startMa - a.startMa || a.genus.localeCompare(b.genus));
}

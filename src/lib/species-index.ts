import type { Groups } from './schemas/groups';
import type { Continent, Diet, PeriodId, Species } from './schemas/species';

/**
 * The compact per-species record the timeline, filters and search need. Built at build time from
 * the validated data (see `speciesIndexPlugin` in vite.config.ts); full records load on demand.
 */
export interface SpeciesIndexEntry {
  slug: string;
  scientificName: string;
  genus: string;
  /** Most specific group id. */
  group: string;
  /** Group ids from the root down to `group`, e.g. ["dinosauria", "theropoda", …]. */
  groupPath: string[];
  isDinosaur: boolean;
  diet: Diet;
  dietConfidence: Species['diet']['confidence'];
  /** First appearance, Ma (older, larger). */
  startMa: number;
  /** Last appearance, Ma (younger, smaller). */
  endMa: number;
  startUncertaintyMa?: number;
  endUncertaintyMa?: number;
  periods: PeriodId[];
  continents: Continent[];
  famous: boolean;
}

export function groupPath(groups: Groups, id: string): string[] {
  const byId = new Map(groups.groups.map((g) => [g.id, g]));
  const path: string[] = [];
  let cur = byId.get(id);
  while (cur) {
    path.unshift(cur.id);
    cur = cur.parent === undefined ? undefined : byId.get(cur.parent);
  }
  return path;
}

/** Species sorted oldest first (then by name), so consumers get a stable order. */
export function buildSpeciesIndex(species: Species[], groups: Groups): SpeciesIndexEntry[] {
  return species
    .map((s): SpeciesIndexEntry => {
      const entry: SpeciesIndexEntry = {
        slug: s.slug,
        scientificName: s.scientificName,
        genus: s.genus,
        group: s.group,
        groupPath: groupPath(groups, s.group),
        isDinosaur: s.isDinosaur,
        diet: s.diet.value,
        dietConfidence: s.diet.confidence,
        startMa: s.timeRange.startMa,
        endMa: s.timeRange.endMa,
        periods: s.periods,
        continents: [...new Set(s.locations.map((l) => l.continent))],
        famous: s.famous,
      };
      if (s.timeRange.startUncertaintyMa !== undefined) {
        entry.startUncertaintyMa = s.timeRange.startUncertaintyMa;
      }
      if (s.timeRange.endUncertaintyMa !== undefined) {
        entry.endUncertaintyMa = s.timeRange.endUncertaintyMa;
      }
      return entry;
    })
    .sort((a, b) => b.startMa - a.startMa || a.genus.localeCompare(b.genus));
}

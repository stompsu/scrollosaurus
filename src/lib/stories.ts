import rawEvents from '../../data/events.json';
import rawSizeReferences from '../../data/size-references.json';
import rawStory from '../../data/story.json';
import { unitById, unitsByRank } from './geologic-time';
import type { Events, SizeReferences, Story, StoryView } from './schemas/stories';
import type { SpeciesIndexEntry } from './species-index';
import type { TimeWindow } from './view-state';

/** Validated at build time by `pnpm validate:data`, so the app trusts the JSON. */
export const events = rawEvents as Events;
export const story = rawStory as Story;
export const sizeReferences = rawSizeReferences as SizeReferences;

const STAGES = unitsByRank('stage');

/**
 * The time window a story step shows: a unit's whole span; the two stages either side of a
 * boundary; or a species' range (through `aroundSpecies`, the timeline's own framing).
 */
export function windowForView(
  view: StoryView,
  aroundSpecies: (item: SpeciesIndexEntry) => TimeWindow,
  speciesBySlug: (slug: string) => SpeciesIndexEntry | undefined,
): TimeWindow | undefined {
  if ('unit' in view) {
    const u = unitById(view.unit);
    return { startMa: u.baseMa, endMa: u.topMa };
  }
  if ('boundaryAtBaseOf' in view) {
    const boundary = unitById(view.boundaryAtBaseOf).baseMa;
    const older = STAGES.find((s) => s.topMa === boundary);
    const younger = STAGES.find((s) => s.baseMa === boundary);
    return older && younger ? { startMa: older.baseMa, endMa: younger.topMa } : undefined;
  }
  const item = speciesBySlug(view.species);
  return item ? aroundSpecies(item) : undefined;
}

/** Sources by id, for a file's citation list. */
export function sourcesById<T extends { id: string }>(sources: readonly T[]): Map<string, T> {
  return new Map(sources.map((s) => [s.id, s]));
}

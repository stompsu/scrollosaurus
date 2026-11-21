import { speciesIndex } from 'virtual:species-index';
import rawSite from '../../data/site.json';
import type { Site } from './schemas/site';
import type { Species } from './schemas/species';
import type { SpeciesIndexEntry } from './species-index';

/**
 * Species data for the app. The index is small and bundled; full records are separate chunks,
 * loaded when a species is opened. All of it is validated at build time by `pnpm validate:data`,
 * so the browser doesn't ship Zod for it.
 */
export const species: readonly SpeciesIndexEntry[] = speciesIndex;

export const site: Site = rawSite;

/** Slug of the species highlighted first when the URL has no selection (Sinosauropteryx). */
export const primarySpeciesSlug: string = site.primarySpecies;

const recordLoaders = import.meta.glob<Species>('/data/species/*.json', { import: 'default' });

export async function loadSpecies(slug: string): Promise<Species | undefined> {
  const load = recordLoaders[`/data/species/${slug}.json`];
  return load ? load() : undefined;
}

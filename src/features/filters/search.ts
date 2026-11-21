import MiniSearch from 'minisearch';
import type { SpeciesIndexEntry } from '@/lib/species-index';

export interface SpeciesSearch {
  /** Best matches first, at most `limit`. Empty for a blank query. */
  search(query: string, limit?: number): SpeciesIndexEntry[];
}

/** Endings of a genus name, so "raptor" finds Velociraptor and "saurus" finds Stegosaurus. */
function genusEndings(genus: string): string {
  const g = genus.toLowerCase();
  const out: string[] = [];
  for (let i = 1; i <= g.length - MIN_ENDING; i++) out.push(g.slice(i));
  return out.join(' ');
}

const MIN_ENDING = 4;

/**
 * Fuzzy, prefix-matching name search that runs in the browser: genus (and any part of it, so
 * "raptor" works), full scientific name and what the name means, in English or Polish ("tyrant", "jaszczur"). Typos
 * within about a fifth of the word still match.
 */
export function createSpeciesSearch(items: readonly SpeciesIndexEntry[]): SpeciesSearch {
  const bySlug = new Map(items.map((it) => [it.slug, it]));
  const index = new MiniSearch<SpeciesIndexEntry>({
    idField: 'slug',
    fields: ['genus', 'scientificName', 'nameMeaning', 'genusEndings'],
    extractField: (doc, field) => {
      switch (field) {
        case 'genusEndings':
          return genusEndings(doc.genus);
        case 'genus':
          return doc.genus;
        case 'scientificName':
          return doc.scientificName;
        case 'nameMeaning':
          // Both languages, so "lizard" and "jaszczur" both find a name.
          return `${doc.nameMeaning.en} ${doc.nameMeaning.pl ?? ''}`;
        default:
          return doc.slug;
      }
    },
    searchOptions: {
      boost: { genus: 3, scientificName: 2, genusEndings: 0.5 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  });
  index.addAll(items);
  return {
    search(query, limit = 8) {
      const q = query.trim();
      if (q === '') return [];
      return index
        .search(q)
        .slice(0, limit)
        .flatMap((r) => {
          const item = bySlug.get(String(r.id));
          return item ? [item] : [];
        });
    },
  };
}

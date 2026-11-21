import type { Groups } from './schemas/groups';
import type { ImageManifest, LicenseFamily } from './schemas/images';
import type { Continent, Diet, PeriodId, Species } from './schemas/species';
// Runtime import with an extension: vite.config.ts loads this file through Node.
import { sizeClassesFor, type SizeClass } from './size-class.ts';

/** A text in English and, when written, Polish. */
export interface LocalText {
  en: string;
  pl?: string | undefined;
}

/** An image ready to show: alt text, derivative files and its full credit. */
export interface SpeciesImage {
  commonsFile: string;
  kind: Species['images'][number]['kind'];
  alt: LocalText;
  /** Visible context for the image, when the data gives one. */
  note?: LocalText;
  /** Path under the site root without width and extension, e.g. "images/1a2b3c4d5e6f". */
  basename: string;
  widths: number[];
  /** Size of the largest derivative, px (for the aspect ratio). */
  width: number;
  height: number;
  placeholder: string;
  author: string;
  attribution?: string;
  license: string;
  licenseFamily: LicenseFamily;
  licenseUrl?: string;
  sourceUrl: string;
}

/**
 * The compact per-species record the timeline, filters and search need. Built at build time from
 * the validated data (see `speciesIndexPlugin` in vite.config.ts); full records load on demand.
 */
export interface SpeciesIndexEntry {
  slug: string;
  scientificName: string;
  genus: string;
  /** What the name means (e.g. "tyrant lizard"), in English and, when written, Polish. */
  nameMeaning: LocalText;
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
  /** Body length range [min, max] in m, when recorded. */
  lengthM?: [number, number];
  /** Size classes the length range touches; empty when the length is unknown. */
  sizeClasses: SizeClass[];
  /** Credited images, first one first; empty until one is chosen. */
  images: SpeciesImage[];
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
export function buildSpeciesIndex(
  species: Species[],
  groups: Groups,
  manifest: ImageManifest = {},
): SpeciesIndexEntry[] {
  return species
    .map((s): SpeciesIndexEntry => {
      const entry: SpeciesIndexEntry = {
        slug: s.slug,
        scientificName: s.scientificName,
        genus: s.genus,
        nameMeaning: s.nameMeaning.text,
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
        sizeClasses: sizeClassesFor(s.size.lengthM?.value),
        // Images without a credit are left out here; validate:data fails the build on them.
        images: s.images.flatMap((img): SpeciesImage[] => {
          const e = manifest[img.commonsFile];
          if (!e) return [];
          return [
            {
              commonsFile: img.commonsFile,
              kind: img.kind,
              alt: img.alt,
              ...(img.note === undefined ? {} : { note: img.note }),
              basename: e.basename,
              widths: e.widths,
              width: e.width,
              height: e.height,
              placeholder: e.placeholder,
              author: e.author,
              ...(e.attribution === undefined ? {} : { attribution: e.attribution }),
              license: e.license,
              licenseFamily: e.licenseFamily,
              ...(e.licenseUrl === undefined ? {} : { licenseUrl: e.licenseUrl }),
              sourceUrl: e.sourceUrl,
            },
          ];
        }),
      };
      if (s.size.lengthM) entry.lengthM = s.size.lengthM.value;
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

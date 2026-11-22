import type { GeologicTime } from './geologic-time';
import type { Groups } from './groups';
import type { Site } from './site';
import { PERIOD_IDS, citations, type PeriodId, type Species } from './species';

export interface SpeciesFile {
  /** File name without extension; must equal the slug. */
  name: string;
  data: Species;
}

export interface CrossCheckInput {
  geologicTime: GeologicTime;
  groups: Groups;
  site: Site;
  species: SpeciesFile[];
}

export interface CrossCheckResult {
  errors: string[];
  warnings: string[];
}

/** Periods whose span overlaps [endMa, startMa]. A zero-length range counts if it falls inside. */
export function periodsForRange(
  geologicTime: GeologicTime,
  startMa: number,
  endMa: number,
): PeriodId[] {
  const isPeriodId = (id: string): id is PeriodId => (PERIOD_IDS as readonly string[]).includes(id);
  return geologicTime.units
    .filter((u) => u.rank === 'period')
    .sort((a, b) => b.baseMa - a.baseMa)
    .filter((p) =>
      // A point age on a boundary belongs to the younger period, whose base it is.
      startMa === endMa
        ? startMa <= p.baseMa && startMa > p.topMa
        : startMa > p.topMa && endMa < p.baseMa,
    )
    .map((p) => p.id)
    .filter(isPeriodId);
}

/** Checks that need more than one file: slugs, group and period references, the primary species. */
export function crossCheck({
  geologicTime,
  groups,
  site,
  species,
}: CrossCheckInput): CrossCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const groupById = new Map(groups.groups.map((g) => [g.id, g]));
  const mesozoic = geologicTime.units.find((u) => u.id === 'mesozoic');
  const slugs = new Set<string>();
  const missingPolish: string[] = [];

  for (const { name, data: s } of species) {
    const at = `species/${name}.json`;
    if (s.slug !== name) errors.push(`${at}: slug "${s.slug}" must match the file name`);
    if (slugs.has(s.slug)) errors.push(`${at}: duplicate slug "${s.slug}"`);
    slugs.add(s.slug);

    const group = groupById.get(s.group);
    if (!group) {
      errors.push(`${at}: unknown group "${s.group}"`);
    } else if (group.isDinosaur !== s.isDinosaur) {
      errors.push(
        `${at}: isDinosaur is ${String(s.isDinosaur)} but group "${group.id}" says otherwise`,
      );
    }

    const { startMa, endMa } = s.timeRange;
    if (mesozoic && (startMa > mesozoic.baseMa || endMa < mesozoic.topMa)) {
      errors.push(
        `${at}: timeRange ${String(startMa)}–${String(endMa)} Ma is outside the Mesozoic`,
      );
    }
    const expected = periodsForRange(geologicTime, startMa, endMa);
    if (expected.join() !== s.periods.join()) {
      errors.push(
        `${at}: periods [${s.periods.join(', ')}] should be [${expected.join(', ')}] for ${String(startMa)}–${String(endMa)} Ma`,
      );
    }

    // Every size field is either filled or explicitly flagged as uncertain.
    const flagged = new Set((s.uncertain ?? []).map((u) => u.field));
    for (const key of ['lengthM', 'massKg'] as const) {
      if (s.size[key] === undefined && !flagged.has(`size.${key}`)) {
        warnings.push(`${at}: size.${key} is empty but not listed in uncertain`);
      }
    }
    if (s.diet.confidence === 'debated' && !flagged.has('diet')) {
      warnings.push(`${at}: diet is debated but not listed in uncertain`);
    }
    const cited = new Set(citations(s).flatMap(([, ids]) => ids));
    const uncited = s.sources.filter((src) => !cited.has(src.id)).map((src) => src.id);
    if (uncited.length > 0) {
      warnings.push(`${at}: sources not cited by any field: ${uncited.join(', ')}`);
    }

    for (const path of untranslated(s)) missingPolish.push(`${at}: no Polish text at ${path}`);
  }

  // Every text is bilingual since Phase 6: a missing Polish translation fails the build.
  errors.push(...missingPolish);

  if (!slugs.has(site.primarySpecies)) {
    errors.push(`site.json: primarySpecies "${site.primarySpecies}" has no species file`);
  }

  return { errors, warnings };
}

/**
 * Paths of `{ en, pl }` texts that have no Polish, anywhere in a data value (species records,
 * story, notes…). Used by validate:data, which fails the build on any.
 */
export function untranslated(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => untranslated(v, `${path}[${String(i)}]`));
  }
  if (value === null || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;
  const own = typeof obj.en === 'string' && typeof obj.pl !== 'string' ? [path || '(root)'] : [];
  return [
    ...own,
    ...Object.entries(obj).flatMap(([k, v]) => untranslated(v, path ? `${path}.${k}` : k)),
  ];
}

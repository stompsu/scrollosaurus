import type { GeologicTime } from './geologic-time';
import type { Groups } from './groups';
import type { Site } from './site';
import { PERIOD_IDS, type PeriodId, type Species } from './species';

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
    const cited = new Set(
      [
        s.timeRange.sourceIds,
        s.diet.sourceIds,
        s.discovery.sourceIds,
        s.taxonomy.sourceIds ?? [],
        s.nameMeaning.sourceIds,
        s.groupSourceIds,
        ...s.locations.map((l) => l.sourceIds),
        ...[s.size.lengthM, s.size.massKg, s.size.heightM].map((m) => m?.sourceIds ?? []),
        ...(s.funFacts ?? []).map((f) => f.sourceIds),
      ].flat(),
    );
    const uncited = s.sources.filter((src) => !cited.has(src.id)).map((src) => src.id);
    if (uncited.length > 0) {
      warnings.push(`${at}: sources not cited by any field: ${uncited.join(', ')}`);
    }

    const texts = [
      s.nameMeaning.text,
      s.summary,
      ...(s.funFacts ?? []).map((f) => f.text),
      ...s.images.map((img) => img.alt),
    ];
    if (texts.some((t) => t.pl === undefined)) missingPolish.push(s.slug);
  }

  // Polish is planned for Phase 6, so missing translations are one summary warning, not errors.
  if (missingPolish.length > 0) {
    warnings.push(`${String(missingPolish.length)} species have no Polish text yet (Phase 6)`);
  }

  if (!slugs.has(site.primarySpecies)) {
    errors.push(`site.json: primarySpecies "${site.primarySpecies}" has no species file`);
  }

  return { errors, warnings };
}

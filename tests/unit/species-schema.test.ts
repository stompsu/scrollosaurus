import { describe, expect, it } from 'vitest';
import rawGeologicTime from '../../data/geologic-time.json';
import { crossCheck, periodsForRange, type CrossCheckInput } from '@/lib/schemas/cross-check';
import type { GeologicTime } from '@/lib/schemas/geologic-time';
import { groupsSchema, type Groups } from '@/lib/schemas/groups';
import { speciesSchema, type Species } from '@/lib/schemas/species';

const geologicTime = rawGeologicTime as GeologicTime;

// Fixture values are placeholders for testing the schema, not facts about a real animal.
const source = {
  id: 'src',
  title: 'Test source',
  url: 'https://example.org',
  accessed: '2026-11-20',
};

function species(overrides: Partial<Record<keyof Species, unknown>> = {}): Record<string, unknown> {
  return {
    slug: 'testosaurus',
    scientificName: 'Testosaurus exemplaris',
    genus: 'Testosaurus',
    nameMeaning: { text: { en: 'test lizard', pl: 'jaszczur testowy' }, sourceIds: ['src'] },
    group: 'theropoda',
    groupSourceIds: ['src'],
    isDinosaur: true,
    taxonomy: { status: 'valid' },
    diet: { value: 'carnivore', confidence: 'established', sourceIds: ['src'] },
    timeRange: { startMa: 150, endMa: 145, sourceIds: ['src'] },
    periods: ['jurassic'],
    size: {
      lengthM: { value: [2, 3], sourceIds: ['src'] },
      massKg: { value: [50, 80], sourceIds: ['src'] },
    },
    locations: [{ continent: 'europe', countryCode: 'GB', sourceIds: ['src'] }],
    discovery: { describedBy: 'A. Author', year: 1900, sourceIds: ['src'] },
    summary: { text: { en: 'A test animal.', pl: 'Zwierzę testowe.' }, sourceIds: ['src'] },
    famous: false,
    images: [],
    sources: [source],
    lastReviewed: '2026-11-20',
    ...overrides,
  };
}

function messages(data: unknown): string[] {
  const r = speciesSchema.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

const groups: Groups = groupsSchema.parse({
  groups: [
    { id: 'dinosauria', name: 'Dinosauria', isDinosaur: true, sourceIds: ['src'] },
    {
      id: 'theropoda',
      name: 'Theropoda',
      parent: 'dinosauria',
      isDinosaur: true,
      filter: 'clade',
      sourceIds: ['src'],
    },
    { id: 'pterosauria', name: 'Pterosauria', isDinosaur: false, sourceIds: ['src'] },
  ],
  sources: [source],
  lastReviewed: '2026-11-20',
});

function check(overrides: Partial<Record<keyof Species, unknown>> = {}, name = 'testosaurus') {
  const input: CrossCheckInput = {
    geologicTime,
    groups,
    site: { primarySpecies: 'testosaurus' },
    species: [{ name, data: speciesSchema.parse(species(overrides)) }],
  };
  return crossCheck(input);
}

describe('speciesSchema', () => {
  it('accepts a complete record', () => {
    expect(messages(species())).toEqual([]);
  });

  it('rejects a citation of an unknown source', () => {
    const m = messages(species({ timeRange: { startMa: 150, endMa: 145, sourceIds: ['nope'] } }));
    expect(m).toContainEqual(expect.stringMatching(/timeRange cites unknown source "nope"/));
  });

  it('rejects a record without sources', () => {
    expect(messages(species({ sources: [] })).length).toBeGreaterThan(0);
  });

  it('rejects an inverted time range', () => {
    const m = messages(species({ timeRange: { startMa: 140, endMa: 145, sourceIds: ['src'] } }));
    expect(m).toContainEqual(expect.stringMatching(/startMa \(older\)/));
  });

  it('rejects an inverted size range', () => {
    const m = messages(species({ size: { lengthM: { value: [3, 2], sourceIds: ['src'] } } }));
    expect(m).toContainEqual(expect.stringMatching(/min must be <= max/));
  });

  it('requires a note for a debated diet', () => {
    const m = messages(
      species({ diet: { value: 'piscivore', confidence: 'debated', sourceIds: ['src'] } }),
    );
    expect(m).toContainEqual(expect.stringMatching(/debated diet needs a note/));
  });

  it('requires a note and sources for a dubious genus', () => {
    const m = messages(species({ taxonomy: { status: 'dubious' } }));
    expect(m).toContainEqual(expect.stringMatching(/needs a note and sourceIds/));
  });

  it('rejects an English summary over 80 words', () => {
    const m = messages(
      species({ summary: { text: { en: Array(81).fill('word').join(' ') }, sourceIds: ['src'] } }),
    );
    expect(m).toContainEqual(expect.stringMatching(/80 words/));
  });

  it('rejects a scientific name that does not start with the genus', () => {
    const m = messages(species({ scientificName: 'Otherus exemplaris' }));
    expect(m).toContainEqual(expect.stringMatching(/start with the genus/));
  });

  it('requires the summary to cite sources', () => {
    expect(
      messages(species({ summary: { text: { en: 'A test animal.' } } })).length,
    ).toBeGreaterThan(0);
  });

  it.each(['javascript:alert(1)', 'mailto:a@example.org', 'ftp://example.org/x'])(
    'rejects a source URL with scheme %s',
    (url) => {
      expect(messages(species({ sources: [{ ...source, url }] })).length).toBeGreaterThan(0);
    },
  );

  it('rejects a genus that is only a prefix of the scientific name', () => {
    const m = messages(species({ scientificName: 'Testosaurusx exemplaris' }));
    expect(m).toContainEqual(expect.stringMatching(/start with the genus/));
  });

  it('keeps naming history out of describedBy', () => {
    const m = messages(
      species({
        discovery: { describedBy: 'Gilmore (as Troodon)', year: 1931, sourceIds: ['src'] },
      }),
    );
    expect(m).toContainEqual(expect.stringMatching(/discovery.note/));
  });

  it('rejects unknown fields', () => {
    expect(messages({ ...species(), weight: 5 }).length).toBeGreaterThan(0);
  });

  it('accepts an image choice without hand-typed credits', () => {
    const image = { commonsFile: 'File:Test.jpg', kind: 'fossil', alt: { en: 'A fossil' } };
    expect(messages(species({ images: [image] }))).toEqual([]);
  });

  it('rejects hand-typed image credits (they are fetched from Commons in Phase 4)', () => {
    const image = {
      commonsFile: 'File:Test.jpg',
      kind: 'fossil',
      alt: { en: 'A fossil' },
      credit: { author: 'Someone' },
    };
    expect(messages(species({ images: [image] })).length).toBeGreaterThan(0);
  });

  it('rejects a country name instead of an ISO code', () => {
    const m = messages(
      species({ locations: [{ continent: 'europe', countryCode: 'England', sourceIds: ['src'] }] }),
    );
    expect(m).toContainEqual(expect.stringMatching(/ISO 3166-1/));
  });

  it('rejects a field listed twice in uncertain', () => {
    const u = { field: 'diet', note: { en: 'x' } };
    expect(messages(species({ uncertain: [u, u] }))).toContainEqual(
      expect.stringMatching(/listed twice|lists a field twice/),
    );
  });
});

describe('periodsForRange', () => {
  it.each([
    [240, 230, ['triassic']],
    [205, 195, ['triassic', 'jurassic']],
    [150, 70, ['jurassic', 'cretaceous']],
    // Touching a boundary is not living in the next period.
    [210, 201.4, ['triassic']],
    [201.4, 190, ['jurassic']],
    // A single point on a boundary belongs to the younger period.
    [143.1, 143.1, ['cretaceous']],
  ])('%s–%s Ma → %j', (start, end, expected) => {
    expect(periodsForRange(geologicTime, start, end)).toEqual(expected);
  });
});

describe('crossCheck', () => {
  it('passes a consistent record', () => {
    expect(check().errors).toEqual([]);
  });

  it('fails a text without Polish, naming where it is', () => {
    expect(
      check({ summary: { text: { en: 'A test animal.' }, sourceIds: ['src'] } }).errors,
    ).toEqual([expect.stringMatching(/no Polish text at summary\.text$/)]);
    expect(check().warnings).toEqual([]);
  });

  it('warns when a size is empty but not flagged as uncertain', () => {
    expect(check({ size: {} }).warnings).toContainEqual(
      expect.stringMatching(/size.lengthM is empty but not listed/),
    );
    const flagged = check({
      size: {},
      uncertain: [
        { field: 'size.lengthM', note: { en: 'No published estimate' } },
        { field: 'size.massKg', note: { en: 'No published estimate' } },
      ],
    });
    expect(flagged.warnings.filter((w) => w.includes('size.'))).toEqual([]);
  });

  it('warns when a debated diet is not listed in uncertain', () => {
    const r = check({
      diet: {
        value: 'piscivore',
        confidence: 'debated',
        sourceIds: ['src'],
        note: { en: 'Disputed' },
      },
    });
    expect(r.warnings).toContainEqual(expect.stringMatching(/diet is debated/));
  });

  it('warns about sources no field cites', () => {
    const extra = { ...source, id: 'unused' };
    expect(check({ sources: [source, extra] }).warnings).toContainEqual(
      expect.stringMatching(/not cited by any field: unused/),
    );
  });

  it('requires the slug to match the file name', () => {
    expect(check({}, 'other').errors).toContainEqual(expect.stringMatching(/must match the file/));
  });

  it('rejects periods that disagree with the time range', () => {
    expect(check({ periods: ['cretaceous'] }).errors).toContainEqual(
      expect.stringMatching(/should be \[jurassic\]/),
    );
  });

  it('rejects a time range outside the Mesozoic', () => {
    expect(
      check({ timeRange: { startMa: 70, endMa: 60, sourceIds: ['src'] }, periods: ['cretaceous'] })
        .errors,
    ).toContainEqual(expect.stringMatching(/outside the Mesozoic/));
  });

  it('rejects an unknown group', () => {
    expect(check({ group: 'nope' }).errors).toContainEqual(expect.stringMatching(/unknown group/));
  });

  it('rejects isDinosaur that disagrees with the group', () => {
    expect(check({ group: 'pterosauria' }).errors).toContainEqual(
      expect.stringMatching(/isDinosaur/),
    );
  });

  it('requires the primary species to exist', () => {
    const r = crossCheck({
      geologicTime,
      groups,
      site: { primarySpecies: 'missing' },
      species: [],
    });
    expect(r.errors).toContainEqual(expect.stringMatching(/primarySpecies "missing"/));
  });
});

describe('groupsSchema', () => {
  const base = { sources: [source], lastReviewed: '2026-11-20' };
  const node = (id: string, parent?: string, isDinosaur = true) => ({
    id,
    name: id,
    isDinosaur,
    sourceIds: ['src'],
    ...(parent ? { parent } : {}),
  });

  it('rejects an unknown parent', () => {
    expect(groupsSchema.safeParse({ ...base, groups: [node('a', 'b')] }).success).toBe(false);
  });

  it('rejects a child whose isDinosaur differs from its parent', () => {
    const r = groupsSchema.safeParse({
      ...base,
      groups: [node('dinosauria'), node('b', 'dinosauria', false)],
    });
    expect(r.success).toBe(false);
  });

  it('rejects a dinosaur root other than dinosauria', () => {
    const r = groupsSchema.safeParse({ ...base, groups: [node('theropoda')] });
    expect(r.success).toBe(false);
  });

  it('rejects a cycle', () => {
    const r = groupsSchema.safeParse({ ...base, groups: [node('a', 'b'), node('b', 'a')] });
    expect(r.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import rawGeologicTime from '../../data/geologic-time.json';
import rawGroups from '../../data/groups.json';
import rawSite from '../../data/site.json';
import { crossCheck, periodsForRange, type SpeciesFile } from '@/lib/schemas/cross-check';
import type { GeologicTime } from '@/lib/schemas/geologic-time';
import { groupsSchema } from '@/lib/schemas/groups';
import { siteSchema } from '@/lib/schemas/site';
import { speciesSchema } from '@/lib/schemas/species';

// The real data, checked the same way `pnpm validate:data` does, so `pnpm test` catches it too.
const files = import.meta.glob<unknown>('../../data/species/*.json', {
  eager: true,
  import: 'default',
});
const geologicTime = rawGeologicTime as GeologicTime;

describe('real data files', () => {
  const species: SpeciesFile[] = Object.entries(files).map(([path, raw]) => {
    const name = /([^/]+)\.json$/.exec(path)?.[1] ?? path;
    return { name, data: speciesSchema.parse(raw) };
  });

  it('has the seed set', () => {
    expect(species.length).toBeGreaterThanOrEqual(30);
  });

  it('passes the group and site schemas', () => {
    expect(groupsSchema.safeParse(rawGroups).success).toBe(true);
    expect(siteSchema.safeParse(rawSite).success).toBe(true);
  });

  it('passes every cross-file check', () => {
    const result = crossCheck({
      geologicTime,
      groups: groupsSchema.parse(rawGroups),
      site: siteSchema.parse(rawSite),
      species,
    });
    expect(result.errors).toEqual([]);
  });

  it('includes the primary species, Sinosauropteryx', () => {
    expect(siteSchema.parse(rawSite).primarySpecies).toBe('sinosauropteryx');
    expect(species.some((s) => s.data.slug === 'sinosauropteryx')).toBe(true);
  });
});

describe('schema edge cases', () => {
  const src = { id: 'a', title: 'T', url: 'https://example.org', accessed: '2026-11-20' };

  it('rejects a duplicate source id in a species record', () => {
    const raw = Object.values(files)[0] as { sources: unknown[] };
    const dup = { ...raw, sources: [...raw.sources, raw.sources[0]] };
    const r = speciesSchema.safeParse(dup);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContainEqual(
      expect.stringMatching(/Duplicate source id/),
    );
  });

  it('rejects a duplicate group id and a citation of an unknown source', () => {
    const node = { id: 'g', name: 'G', isDinosaur: true, sourceIds: ['a'] };
    const dup = groupsSchema.safeParse({
      groups: [node, node],
      sources: [src],
      lastReviewed: '2026-11-20',
    });
    const unknown = groupsSchema.safeParse({
      groups: [{ ...node, sourceIds: ['zzz'] }],
      sources: [src],
      lastReviewed: '2026-11-20',
    });
    expect(dup.success).toBe(false);
    expect(unknown.success).toBe(false);
  });

  it('flags a duplicate slug across files', () => {
    const raw = speciesSchema.parse(Object.values(files)[0]);
    const r = crossCheck({
      geologicTime,
      groups: groupsSchema.parse(rawGroups),
      site: { primarySpecies: raw.slug },
      species: [
        { name: raw.slug, data: raw },
        { name: raw.slug, data: raw },
      ],
    });
    expect(r.errors).toContainEqual(expect.stringMatching(/duplicate slug/));
  });

  it('rejects unknown sources cited by size and fun facts', () => {
    const raw = speciesSchema.parse(Object.values(files)[0]);
    const bad = {
      ...raw,
      size: { massKg: { value: [1, 2], sourceIds: ['nope'] } },
      funFacts: [{ text: { en: 'x' }, sourceIds: ['nope2'] }],
    };
    const r = speciesSchema.safeParse(bad);
    const m = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(m).toContainEqual(expect.stringMatching(/size.massKg cites unknown source "nope"/));
    expect(m).toContainEqual(expect.stringMatching(/funFacts.0 cites unknown source "nope2"/));
  });

  it('rejects malformed site settings', () => {
    expect(siteSchema.safeParse({ primarySpecies: 'Not A Slug' }).success).toBe(false);
    expect(siteSchema.safeParse({ primarySpecies: 'x', extra: 1 }).success).toBe(false);
  });

  it('treats a range ending on a period base as not entering the older period', () => {
    // Ends exactly at the base of the Cretaceous (143.1 Ma): Jurassic only.
    expect(periodsForRange(geologicTime, 150, 143.1)).toEqual(['jurassic']);
  });
});

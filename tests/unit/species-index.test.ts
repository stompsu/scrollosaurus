import { describe, expect, it } from 'vitest';
import { loadSpecies, primarySpeciesSlug, species } from '@/lib/species';

describe('species index (virtual module)', () => {
  it('lists every seed species, oldest first', () => {
    expect(species.length).toBeGreaterThanOrEqual(30);
    for (let i = 1; i < species.length; i++) {
      expect(species[i - 1]?.startMa).toBeGreaterThanOrEqual(species[i]?.startMa ?? 0);
    }
  });

  it('includes group ancestry from the root', () => {
    const t = species.find((s) => s.slug === 'tyrannosaurus');
    expect(t?.groupPath[0]).toBe('dinosauria');
    expect(t?.groupPath).toContain('theropoda');
    expect(t?.groupPath.at(-1)).toBe('tyrannosauridae');
  });

  it('includes the primary species', () => {
    expect(primarySpeciesSlug).toBe('sinosauropteryx');
    expect(species.some((s) => s.slug === primarySpeciesSlug)).toBe(true);
  });

  it('loads a full record on demand', async () => {
    const record = await loadSpecies('sinosauropteryx');
    expect(record?.scientificName).toBe('Sinosauropteryx prima');
    expect(await loadSpecies('nope')).toBeUndefined();
  });
});

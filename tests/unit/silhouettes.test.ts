import { describe, expect, it } from 'vitest';
import { bodyPlanFor, SILHOUETTES } from '@/components/ui/silhouettes';
import { species } from '@/lib/species';

describe('bodyPlanFor', () => {
  it.each([
    [['ichthyosauria'], 'ichthyosaur'],
    [['silesauridae'], 'silesaurid'],
    [['dicynodontia'], 'dicynodont'],
    [['pterosauria', 'azhdarchidae'], 'pterosaur'],
    [['dinosauria', 'ornithischia', 'marginocephalia', 'ceratopsia'], 'ceratopsian'],
  ])('%j → %s', (path, plan) => {
    expect(bodyPlanFor(path)).toBe(plan);
  });

  it('never draws a non-dinosaur as a theropod', () => {
    const wrong = species
      .filter((s) => !s.isDinosaur && bodyPlanFor(s.groupPath).includes('theropod'))
      .map((s) => s.slug);
    expect(wrong).toEqual([]);
  });

  it('has a drawing for every body plan', () => {
    for (const s of species) expect(SILHOUETTES[bodyPlanFor(s.groupPath)]).toBeDefined();
  });
});

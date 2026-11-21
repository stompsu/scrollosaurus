import { describe, expect, it } from 'vitest';
import { livedAlongside } from '@/lib/lived-alongside';
import { sizeClassesFor } from '@/lib/size-class';
import { species } from '@/lib/species';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  matchesSpeciesFilters,
  parseViewState,
  queryString,
  serializeViewState,
  type SpeciesFilters,
  type ViewState,
} from '@/lib/view-state';

const bySlug = (slug: string): SpeciesIndexEntry => {
  const s = species.find((x) => x.slug === slug);
  if (!s) throw new Error(`no ${slug}`);
  return s;
};

const shown = (f: Partial<SpeciesFilters>) =>
  species.filter((s) => matchesSpeciesFilters(s, { ...EMPTY_FILTERS, ...f })).map((s) => s.slug);

describe('size classes', () => {
  it.each([
    [[0.5, 0.5], ['small']],
    [[2, 2], ['medium']],
    [
      [4.8, 10],
      ['medium', 'large'],
    ],
    [
      [11, 12],
      ['large', 'giant'],
    ],
    [[35, 39.7], ['giant']],
  ] as const)('%j → %j', (length, classes) => {
    expect(sizeClassesFor(length)).toEqual(classes);
  });

  it('is empty when the length is unknown', () => {
    expect(sizeClassesFor(undefined)).toEqual([]);
  });

  it('is in the species index', () => {
    expect(bySlug('plateosaurus').sizeClasses).toEqual(['medium', 'large']);
    expect(bySlug('mamenchisaurus').sizeClasses).toEqual([]);
    expect(bySlug('sinosauropteryx').nameMeaning).toBe('Chinese lizard wing');
  });
});

describe('view state in the URL', () => {
  const full: ViewState = {
    filters: {
      diets: ['carnivore', 'piscivore'],
      groups: ['theropoda', 'spinosauridae'],
      periods: ['cretaceous'],
      sizes: ['giant', 'unknown'],
      continents: ['africa', 'south-america'],
      famousOnly: true,
      nonDinosaurs: true,
    },
    window: { startMa: 101.234, endMa: 93.5 },
  };

  it('round-trips filters and the window (to 0.01 Ma)', () => {
    const qs = queryString(serializeViewState(full));
    expect(qs).toBe(
      '?diet=carnivore,piscivore&group=theropoda,spinosauridae&period=cretaceous&size=giant,unknown' +
        '&continent=africa,south-america&famous=1&nondino=1&from=101.23&to=93.5',
    );
    const back = parseViewState(new URLSearchParams(qs));
    expect(back.filters).toEqual(full.filters);
    expect(back.window).toEqual({ startMa: 101.23, endMa: 93.5 });
  });

  it('writes nothing for the default view', () => {
    expect(queryString(serializeViewState({ filters: EMPTY_FILTERS }))).toBe('');
    expect(parseViewState(new URLSearchParams(''))).toEqual({ filters: EMPTY_FILTERS });
  });

  it('drops unknown values, duplicates and bad windows, and orders values canonically', () => {
    const v = parseViewState(
      new URLSearchParams('?diet=piscivore,carnivore,lava,carnivore&group=nope&from=60&to=100'),
    );
    expect(v.filters.diets).toEqual(['carnivore', 'piscivore']);
    expect(v.filters.groups).toEqual([]);
    expect(v.window).toBeUndefined();
    expect(parseViewState(new URLSearchParams('?from=abc&to=1')).window).toBeUndefined();
    expect(parseViewState(new URLSearchParams('?from=30&to=10')).window).toBeUndefined();
  });

  it('clamps windows to the Mesozoic when reading and writing', () => {
    expect(parseViewState(new URLSearchParams('?from=999&to=-50')).window).toEqual({
      startMa: 251.902,
      endMa: 66,
    });
    const qs = queryString(
      serializeViewState({ filters: EMPTY_FILTERS, window: { startMa: 80, endMa: 61.23 } }),
    );
    expect(qs).toBe('?from=80&to=66');
  });

  it('keeps the tour step, dropping nonsense', () => {
    expect(parseViewState(new URLSearchParams('?tour=3')).tour).toBe(3);
    expect(parseViewState(new URLSearchParams('?tour=0')).tour).toBeUndefined();
    expect(parseViewState(new URLSearchParams('?tour=1.5')).tour).toBeUndefined();
    expect(queryString(serializeViewState({ filters: EMPTY_FILTERS, tour: 2 }))).toBe('?tour=2');
  });

  it('counts active filters, not the non-dinosaur layer', () => {
    expect(activeFilterCount(full.filters)).toBe(10);
    expect(activeFilterCount({ ...EMPTY_FILTERS, nonDinosaurs: true })).toBe(0);
  });
});

describe('filter matching', () => {
  it('hides non-dinosaurs unless the layer is on', () => {
    expect(shown({})).not.toContain('pteranodon');
    expect(shown({ nonDinosaurs: true })).toContain('pteranodon');
  });

  it('ORs values within a filter and ANDs filters together', () => {
    const fishOrMeat = shown({ diets: ['carnivore', 'piscivore'] });
    expect(fishOrMeat).toContain('spinosaurus');
    expect(fishOrMeat).toContain('tyrannosaurus');
    const asianCarnivores = shown({ diets: ['carnivore'], continents: ['asia'] });
    expect(asianCarnivores).toContain('velociraptor');
    expect(asianCarnivores).not.toContain('tyrannosaurus');
  });

  it('matches a group anywhere in the ancestry', () => {
    const theropods = shown({ groups: ['theropoda'] });
    expect(theropods).toContain('tyrannosaurus');
    expect(theropods).toContain('sinosauropteryx');
    expect(theropods).not.toContain('triceratops');
  });

  it('matches "size unknown" only for species with no length', () => {
    expect(shown({ sizes: ['unknown'] })).toEqual(['mamenchisaurus']);
    expect(shown({ sizes: ['unknown'], nonDinosaurs: true }).sort()).toEqual(
      ['mamenchisaurus', 'plesiosaurus', 'pteranodon', 'quetzalcoatlus'].sort(),
    );
    expect(shown({ sizes: ['medium'] })).toContain('plateosaurus');
    expect(shown({ sizes: ['large'] })).toContain('plateosaurus');
  });

  it('filters by period and fame', () => {
    expect(shown({ periods: ['triassic'] })).toContain('eoraptor');
    expect(shown({ periods: ['triassic'] })).not.toContain('tyrannosaurus');
    expect(shown({ famousOnly: true })).not.toContain('sinosauropteryx');
  });
});

describe('lived alongside', () => {
  it('lists overlapping species, longest overlap first, never the species itself', () => {
    const trex = bySlug('tyrannosaurus');
    const list = livedAlongside(trex, species);
    const slugs = list.map((c) => c.item.slug);
    expect(slugs).toContain('triceratops');
    expect(slugs).not.toContain('tyrannosaurus');
    expect(slugs).not.toContain('stegosaurus');
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]?.overlapMa).toBeGreaterThanOrEqual(list[i]?.overlapMa ?? 0);
    }
    for (const c of list) {
      expect(c.item.startMa).toBeGreaterThan(trex.endMa);
      expect(c.item.endMa).toBeLessThan(trex.startMa);
    }
  });
});

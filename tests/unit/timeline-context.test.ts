import { describe, expect, it } from 'vitest';
import { matchesFilters, windowContext } from '@/features/timeline/Timeline';
import { species } from '@/lib/species';

const all = ['era', 'period', 'epoch', 'stage'] as const;

describe('windowContext', () => {
  it('names every period in the whole-Mesozoic view, not the one at the centre', () => {
    expect(windowContext('en', { startMa: 260, endMa: 60 }, ['era', 'period'])).toBe(
      'Triassic to Cretaceous',
    );
  });

  it('names a single period and drops epochs that just list all of its children', () => {
    expect(windowContext('en', { startMa: 201.4, endMa: 143.1 }, ['era', 'period', 'epoch'])).toBe(
      'Jurassic',
    );
  });

  it('names a range when the view straddles a boundary, without finer ranks', () => {
    expect(windowContext('en', { startMa: 150, endMa: 130 }, all)).toBe('Jurassic to Cretaceous');
  });

  it('refines down to stages under a single epoch', () => {
    expect(windowContext('en', { startMa: 130.2, endMa: 119.7 }, all)).toBe(
      'Cretaceous, Early Cretaceous, Hauterivian to Aptian',
    );
    expect(windowContext('en', { startMa: 125, endMa: 123 }, all)).toBe(
      'Cretaceous, Early Cretaceous, Barremian',
    );
  });

  it('ignores slivers from rounding at exact boundaries', () => {
    expect(
      windowContext('en', { startMa: 201.4000001, endMa: 143.0999999 }, ['era', 'period']),
    ).toBe('Jurassic');
  });
});

describe('matchesFilters', () => {
  const pteranodon = species.find((s) => s.slug === 'pteranodon');
  const trex = species.find((s) => s.slug === 'tyrannosaurus');

  it('hides non-dinosaurs by default and shows them on request', () => {
    if (!pteranodon || !trex) throw new Error('seed species missing');
    expect(matchesFilters(trex)).toBe(true);
    expect(matchesFilters(pteranodon)).toBe(false);
    expect(matchesFilters(pteranodon, { includeNonDinosaurs: true })).toBe(true);
    expect(matchesFilters(trex, { predicate: (s) => s.diet === 'herbivore' })).toBe(false);
  });
});

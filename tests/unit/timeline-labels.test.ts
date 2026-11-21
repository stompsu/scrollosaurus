import { describe, expect, it } from 'vitest';
import {
  bandLabelCandidates,
  boundariesOf,
  describeBoundary,
  formatBoundary,
  pickLabel,
  thinLabels,
} from '@/features/timeline/labels';
import { unitById, unitsByRank } from '@/lib/geologic-time';

describe('boundary labels', () => {
  it('marks approximate boundaries with "~"', () => {
    expect(formatBoundary({ ma: 237, approximate: true })).toBe('~237');
    expect(describeBoundary({ ma: 237, approximate: true })).toBe('about 237');
  });

  it('shows "±" where the chart gives an uncertainty, without rounding it away', () => {
    expect(formatBoundary({ ma: 201.4, uncertaintyMa: 0.2 })).toBe('201.4 ±0.2');
    expect(formatBoundary({ ma: 251.902, uncertaintyMa: 0.024 })).toBe('251.9 ±0.024');
    expect(formatBoundary({ ma: 161.5, uncertaintyMa: 1.0 })).toBe('161.5 ±1');
    expect(describeBoundary({ ma: 201.4, uncertaintyMa: 0.2 })).toBe('201.4 plus or minus 0.2');
  });

  it('uses formatMa for exact boundaries', () => {
    expect(formatBoundary({ ma: 66 })).toBe('66');
    expect(formatBoundary({ ma: 125.77 })).toBe('125.8');
    expect(formatBoundary({ ma: 66, uncertaintyMa: 0 })).toBe('66');
  });

  it('reads boundaries and their flags from the geologic-time data', () => {
    const triassicEpochs = unitsByRank('epoch').filter((u) => u.parent === 'triassic');
    const labels = boundariesOf(triassicEpochs).map(formatBoundary);
    expect(labels).toEqual(['251.9 ±0.024', '246.7', '~237', '201.4 ±0.2']);
    const periods = boundariesOf(unitsByRank('period'));
    expect(periods.map((b) => b.ma)).toEqual([251.902, 201.4, 143.1, 66]);
  });
});

describe('band labels', () => {
  const measure = (text: string) => text.length * 7;

  it('shortens, then drops, labels with no room', () => {
    const candidates = bandLabelCandidates(unitById('early-jurassic'));
    expect(candidates).toEqual(['Early Jurassic', 'Early', 'E.', '']);
    expect(pickLabel(candidates, 200, measure)).toBe('Early Jurassic');
    expect(pickLabel(candidates, 40, measure)).toBe('Early');
    expect(pickLabel(candidates, 14, measure)).toBe('E.');
    expect(pickLabel(candidates, 5, measure)).toBe('');
  });

  it('abbreviates stages and periods', () => {
    expect(bandLabelCandidates(unitById('maastrichtian'))).toEqual(['Maastrichtian', 'Maa.', '']);
    expect(bandLabelCandidates(unitById('jurassic'))).toEqual(['Jurassic', 'Jur.', '']);
  });

  it('thins colliding boundary labels, oldest first', () => {
    expect(thinLabels([0, 30, 100, 105, 200], [40, 40, 40, 40, 40], 10)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
  });
});

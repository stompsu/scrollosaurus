import { describe, expect, it } from 'vitest';
import { EPOCH_MAX_SPAN_MA, STAGE_MAX_SPAN_MA } from '@/features/timeline/config';
import { levelScale, ranksForSpan, zoomLevel } from '@/features/timeline/semantic';

describe('ranksForSpan', () => {
  it('always shows era and period bands', () => {
    expect(ranksForSpan(186)).toEqual(['era', 'period']);
  });

  it('adds epochs at period level and stages at close zoom', () => {
    expect(ranksForSpan(EPOCH_MAX_SPAN_MA)).toEqual(['era', 'period', 'epoch']);
    expect(ranksForSpan(60)).toEqual(['era', 'period', 'epoch']);
    expect(ranksForSpan(STAGE_MAX_SPAN_MA)).toEqual(['era', 'period', 'epoch', 'stage']);
    expect(ranksForSpan(2)).toEqual(['era', 'period', 'epoch', 'stage']);
  });
});

describe('zoom levels', () => {
  it('steps every half octave', () => {
    expect(zoomLevel(1)).toBe(0);
    expect(zoomLevel(1.4)).toBe(0);
    expect(zoomLevel(Math.SQRT2)).toBe(1);
    expect(zoomLevel(2)).toBe(2);
    expect(zoomLevel(90)).toBe(12);
  });

  it('levelScale is the smallest k of its level', () => {
    for (const k of [1, 1.3, 2.9, 17, 92]) {
      const level = zoomLevel(k);
      expect(levelScale(level)).toBeLessThanOrEqual(k + 1e-9);
      expect(zoomLevel(levelScale(level))).toBe(level);
      expect(levelScale(level + 1)).toBeGreaterThan(k);
    }
  });
});

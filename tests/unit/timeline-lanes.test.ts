import { describe, expect, it } from 'vitest';
import { markerInterval, packLanes } from '@/features/timeline/lanes';

describe('packLanes', () => {
  it('puts non-overlapping intervals in one lane', () => {
    expect(
      packLanes([
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 40, end: 50 },
      ]),
    ).toEqual({ lanes: [0, 0, 0], laneCount: 1 });
  });

  it('separates overlapping intervals', () => {
    const { lanes, laneCount } = packLanes([
      { start: 0, end: 50 },
      { start: 10, end: 20 },
      { start: 15, end: 60 },
    ]);
    expect(laneCount).toBe(3);
    expect(new Set(lanes).size).toBe(3);
  });

  it('reuses the first free lane (greedy, sorted by start)', () => {
    const { lanes, laneCount } = packLanes([
      { start: 0, end: 10 },
      { start: 5, end: 30 },
      { start: 12, end: 20 },
      { start: 31, end: 40 },
    ]);
    expect(lanes).toEqual([0, 1, 0, 0]);
    expect(laneCount).toBe(2);
  });

  it('uses the minimum number of lanes (the maximum overlap)', () => {
    const intervals = [
      { start: 0, end: 4 },
      { start: 1, end: 3 },
      { start: 2, end: 6 },
      { start: 5, end: 9 },
      { start: 7, end: 8 },
    ];
    expect(packLanes(intervals).laneCount).toBe(3);
  });

  it('keeps a gap between neighbours in a lane', () => {
    const touching = [
      { start: 0, end: 10 },
      { start: 15, end: 20 },
    ];
    expect(packLanes(touching, 0).laneCount).toBe(1);
    expect(packLanes(touching, 10).laneCount).toBe(2);
  });

  it('returns lanes in input order whatever the sort', () => {
    const { lanes } = packLanes([
      { start: 20, end: 30 },
      { start: 0, end: 25 },
    ]);
    expect(lanes).toEqual([1, 0]);
  });

  it('handles an empty input', () => {
    expect(packLanes([])).toEqual({ lanes: [], laneCount: 0 });
  });
});

describe('markerInterval', () => {
  it('covers whiskers, the bar and the label', () => {
    expect(
      markerInterval({
        startPx: 100,
        endPx: 300,
        startWhiskerPx: 5,
        endWhiskerPx: 7,
        labelExtentPx: 50,
        minBarPx: 6,
      }),
    ).toEqual({ start: 95, end: 307 });
  });

  it('reaches as far as a label wider than the bar', () => {
    expect(markerInterval({ startPx: 100, endPx: 110, labelExtentPx: 80, minBarPx: 6 })).toEqual({
      start: 100,
      end: 180,
    });
  });

  it('gives very short ranges the minimum bar width', () => {
    expect(markerInterval({ startPx: 100, endPx: 100.5, labelExtentPx: 0, minBarPx: 6 })).toEqual({
      start: 100,
      end: 106,
    });
  });

  it('hangs end-anchored labels back from the bar end', () => {
    expect(
      markerInterval({
        startPx: 900,
        endPx: 920,
        endWhiskerPx: 3,
        labelExtentPx: 80,
        minBarPx: 6,
        anchor: 'end',
      }),
    ).toEqual({ start: 840, end: 923 });
  });

  it('packs minimum-width markers so they never overlap', () => {
    const short = (start: number) =>
      markerInterval({ startPx: start, endPx: start + 0.1, labelExtentPx: 0, minBarPx: 6 });
    expect(packLanes([short(0), short(3), short(7)]).lanes).toEqual([0, 1, 0]);
  });
});

import { describe, expect, it } from 'vitest';
import { bufferedWindow, itemsInWindow, overlapsWindow } from '@/features/timeline/virtual';

describe('virtualisation window', () => {
  it('adds one viewport of buffer on each side by default', () => {
    expect(bufferedWindow({ startMa: 130, endMa: 120 })).toEqual({ startMa: 140, endMa: 110 });
    expect(bufferedWindow({ startMa: 130, endMa: 120 }, 0.5)).toEqual({
      startMa: 135,
      endMa: 115,
    });
  });

  it('keeps items overlapping the window, including partial overlaps', () => {
    const win = { startMa: 130, endMa: 120 };
    const items = [
      { id: 'inside', startMa: 128, endMa: 125 },
      { id: 'older-edge', startMa: 140, endMa: 129 },
      { id: 'younger-edge', startMa: 121, endMa: 100 },
      { id: 'spanning', startMa: 200, endMa: 66 },
      { id: 'older', startMa: 150, endMa: 131 },
      { id: 'younger', startMa: 119, endMa: 110 },
    ];
    expect(itemsInWindow(items, win).map((i) => i.id)).toEqual([
      'inside',
      'older-edge',
      'younger-edge',
      'spanning',
    ]);
  });

  it('counts uncertainty whiskers as part of the range', () => {
    const win = { startMa: 130, endMa: 120 };
    expect(overlapsWindow({ startMa: 119.5, endMa: 110, startUncertaintyMa: 1 }, win)).toBe(true);
    expect(overlapsWindow({ startMa: 140, endMa: 130.5, endUncertaintyMa: 1 }, win)).toBe(true);
    expect(overlapsWindow({ startMa: 140, endMa: 130.5 }, win)).toBe(false);
  });
});

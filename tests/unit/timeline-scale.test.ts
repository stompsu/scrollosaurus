import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  createTimeScale,
  maToPx,
  maxZoom,
  pxToMa,
  transformAroundCentre,
  transformForWindow,
  visibleWindow,
} from '@/features/timeline/scale';

const domain = { startMa: 250, endMa: 50 };
const scale = createTimeScale(domain, 1000);

describe('time scale', () => {
  it('maps older ages to the start (left/top) and younger to the end', () => {
    expect(scale(250)).toBe(0);
    expect(scale(50)).toBe(1000);
    expect(scale(150)).toBe(500);
  });

  it('converts Ma to px and back under a transform', () => {
    const t = { k: 4, offset: -1200 };
    expect(maToPx(scale, t, 150)).toBe(4 * 500 - 1200);
    expect(pxToMa(scale, t, maToPx(scale, t, 123.4))).toBeCloseTo(123.4, 10);
  });

  it('gives the visible window for a transform', () => {
    expect(visibleWindow(scale, { k: 1, offset: 0 }, 1000)).toEqual({ startMa: 250, endMa: 50 });
    const w = visibleWindow(scale, { k: 2, offset: -500 }, 1000);
    expect(w.startMa).toBeCloseTo(200, 10);
    expect(w.endMa).toBeCloseTo(100, 10);
  });

  it('limits zoom to the minimum span', () => {
    expect(maxZoom(domain, 2)).toBe(100);
    expect(maxZoom({ startMa: 10, endMa: 9 }, 2)).toBe(1);
  });
});

describe('clampOffset', () => {
  it('keeps the domain edges within the margin of the viewport edges', () => {
    expect(clampOffset(100, 1, 1000, 32)).toBe(32);
    expect(clampOffset(-100, 1, 1000, 32)).toBe(-32);
    expect(clampOffset(-5000, 4, 1000, 32)).toBe(1000 - 32 - 4000);
    expect(clampOffset(-1500, 4, 1000, 32)).toBe(-1500);
  });

  it('centres the domain when it is narrower than the viewport', () => {
    expect(clampOffset(300, 0.5, 1000, 0)).toBe(250);
  });
});

describe('transformForWindow', () => {
  it('fits the window and centres it', () => {
    const t = transformForWindow(scale, 1000, { startMa: 200, endMa: 100 }, 100, 0);
    expect(t.k).toBe(2);
    const w = visibleWindow(scale, t, 1000);
    expect(w.startMa).toBeCloseTo(200, 10);
    expect(w.endMa).toBeCloseTo(100, 10);
  });

  it('clamps zoom between the whole domain and the maximum', () => {
    expect(transformForWindow(scale, 1000, { startMa: 400, endMa: 0 }, 100, 0).k).toBe(1);
    expect(transformForWindow(scale, 1000, { startMa: 100.1, endMa: 100 }, 100, 0).k).toBe(100);
  });

  it('clamps pan at the domain edges', () => {
    const t = transformForWindow(scale, 1000, { startMa: 60, endMa: 40 }, 100, 10);
    expect(t.k).toBe(10);
    expect(t.offset).toBe(1000 - 10 - 10 * 1000);
  });
});

describe('transformAroundCentre', () => {
  it('keeps the same Ma at the centre for a different viewport length', () => {
    const wide = transformAroundCentre(scale, 1000, 125, 8, 0);
    const tallScale = createTimeScale(domain, 600);
    const tall = transformAroundCentre(tallScale, 600, 125, 8, 0);
    expect(pxToMa(scale, wide, 500)).toBeCloseTo(125, 10);
    expect(pxToMa(tallScale, tall, 300)).toBeCloseTo(125, 10);
  });
});

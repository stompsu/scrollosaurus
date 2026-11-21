import { scaleLinear, type ScaleLinear } from 'd3-scale';

/** A time window in Ma. `startMa` is the older (larger) end, `endMa` the younger. */
export interface MaRange {
  startMa: number;
  endMa: number;
}

/**
 * The zoom state along the time axis: a pixel at base position `p` (whole domain fitted to the
 * viewport) is drawn at `k * p + offset`.
 */
export interface AxisTransform {
  k: number;
  offset: number;
}

export type TimeScale = ScaleLinear<number, number>;

/** Ma → px with older ages first: `domain.startMa` maps to 0 and `domain.endMa` to `length`. */
export function createTimeScale(domain: MaRange, length: number): TimeScale {
  return scaleLinear().domain([domain.startMa, domain.endMa]).range([0, length]);
}

export function maToPx(scale: TimeScale, t: AxisTransform, ma: number): number {
  return t.k * scale(ma) + t.offset;
}

export function pxToMa(scale: TimeScale, t: AxisTransform, px: number): number {
  return scale.invert((px - t.offset) / t.k);
}

/** The Ma window shown by a viewport of `length` px under transform `t`. */
export function visibleWindow(scale: TimeScale, t: AxisTransform, length: number): MaRange {
  return { startMa: pxToMa(scale, t, 0), endMa: pxToMa(scale, t, length) };
}

export function spanMa(range: MaRange): number {
  return range.startMa - range.endMa;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Largest zoom factor, so that the narrowest window is `minSpanMa` wide. */
export function maxZoom(domain: MaRange, minSpanMa: number): number {
  return Math.max(1, spanMa(domain) / minSpanMa);
}

/**
 * Keeps the domain on screen: the oldest end may move at most `margin` px right of the viewport
 * start and the youngest end at most `margin` px left of the viewport end.
 */
export function clampOffset(offset: number, k: number, length: number, margin: number): number {
  const max = margin;
  const min = length - margin - k * length;
  return min > max ? (min + max) / 2 : clamp(offset, min, max);
}

/** The transform that shows `range` across the viewport, within the zoom and pan limits. */
export function transformForWindow(
  scale: TimeScale,
  length: number,
  range: MaRange,
  kMax: number,
  margin: number,
): AxisTransform {
  const [older = 0, younger = 0] = scale.domain();
  const domainSpan = Math.abs(older - younger);
  const span = Math.max(Math.abs(spanMa(range)), Number.EPSILON);
  const k = clamp(domainSpan / span, 1, kMax);
  const centre = (range.startMa + range.endMa) / 2;
  const offset = clampOffset(length / 2 - k * scale(centre), k, length, margin);
  return { k, offset };
}

/** The transform with zoom `k` that puts `centreMa` in the middle of the viewport. */
export function transformAroundCentre(
  scale: TimeScale,
  length: number,
  centreMa: number,
  k: number,
  margin: number,
): AxisTransform {
  return { k, offset: clampOffset(length / 2 - k * scale(centreMa), k, length, margin) };
}

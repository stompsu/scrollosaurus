import type { GeologicRank } from '@/lib/schemas/geologic-time';
import { EPOCH_MAX_SPAN_MA, STAGE_MAX_SPAN_MA } from './config';

/** Band ranks shown for a visible window `spanMa` wide. Era and period always show. */
export function ranksForSpan(spanMa: number): GeologicRank[] {
  const ranks: GeologicRank[] = ['era', 'period'];
  if (spanMa <= EPOCH_MAX_SPAN_MA) ranks.push('epoch');
  if (spanMa <= STAGE_MAX_SPAN_MA) ranks.push('stage');
  return ranks;
}

/**
 * Discrete zoom level: one step per half octave of `k`. React re-renders (lane packing, labels,
 * bands) only when this changes, never per frame.
 */
export function zoomLevel(k: number): number {
  return Math.floor(Math.log2(k) * 2 + 1e-9);
}

/** The smallest `k` of a zoom level. Layout is computed at this `k`, so it holds for the whole level. */
export function levelScale(level: number): number {
  return 2 ** (level / 2);
}

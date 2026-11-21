/** A marker's footprint along the time axis, in px. */
export interface Interval {
  start: number;
  end: number;
}

export interface LanePacking {
  /** Lane index for each input interval, in input order. */
  lanes: number[];
  laneCount: number;
}

/**
 * Greedy interval partitioning: intervals sorted by start go into the first lane whose last
 * interval ended at least `gap` px earlier. Sorted by start, first fit uses the fewest lanes
 * possible and keeps lane numbers stable for markers that don't overlap anything.
 */
export function packLanes(intervals: readonly Interval[], gap = 0): LanePacking {
  const order = intervals
    .map((iv, i) => ({ iv, i }))
    .sort((a, b) => a.iv.start - b.iv.start || a.iv.end - b.iv.end || a.i - b.i);
  const laneEnds: number[] = [];
  const lanes = new Array<number>(intervals.length).fill(0);
  for (const { iv, i } of order) {
    let lane = laneEnds.findIndex((end) => end + gap <= iv.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(iv.end);
    } else {
      laneEnds[lane] = iv.end;
    }
    lanes[i] = lane;
  }
  return { lanes, laneCount: laneEnds.length };
}

export interface MarkerGeometry {
  /** Bar start (older end), px. */
  startPx: number;
  /** Bar end (younger end), px. */
  endPx: number;
  /** Uncertainty whisker before the start, px. */
  startWhiskerPx?: number;
  /** Uncertainty whisker after the end, px. */
  endWhiskerPx?: number;
  /** How far the label reaches along the time axis from the bar start, px. */
  labelExtentPx: number;
  minBarPx: number;
  /**
   * Where the label hangs: from the bar start (default), or ending at the bar end, used near the
   * young end of the Mesozoic so labels don't run off the timeline.
   */
  anchor?: 'start' | 'end';
}

/** The time-axis footprint of a marker: whiskers, the bar (at least `minBarPx`) and its label. */
export function markerInterval(m: MarkerGeometry): Interval {
  const barEnd = m.startPx + Math.max(m.endPx - m.startPx, m.minBarPx);
  const whiskerStart = m.startPx - (m.startWhiskerPx ?? 0);
  const whiskerEnd = barEnd + (m.endWhiskerPx ?? 0);
  if (m.anchor === 'end') {
    return { start: Math.min(whiskerStart, barEnd - m.labelExtentPx), end: whiskerEnd };
  }
  return { start: whiskerStart, end: Math.max(whiskerEnd, m.startPx + m.labelExtentPx) };
}

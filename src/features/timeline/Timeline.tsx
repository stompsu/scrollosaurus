import {
  memo,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { formatMa, unitById, unitsByRank } from '@/lib/geologic-time';
import type { GeologicRank, GeologicUnit } from '@/lib/schemas/geologic-time';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import {
  LANE_GAP_PX,
  LANE_PADDING_PX,
  LANE_SIZE_PX,
  MIN_BAR_PX,
  MIN_VISIBLE_SPAN_MA,
  VERTICAL_LABEL_EXTENT_PX,
  ZOOM_STEP,
} from './config';
import { TimelineEngine, type TimelineSnapshot } from './engine';
import {
  bandLabelCandidates,
  boundariesOf,
  describeBoundary,
  formatBoundary,
  pickLabel,
  thinLabels,
} from './labels';
import { markerInterval, packLanes } from './lanes';
import { createTextMeasure } from './measure';
import { createTimeScale, spanMa, visibleWindow, type MaRange } from './scale';
import { levelScale, ranksForSpan, zoomLevel } from './semantic';
import { useOrientation } from './useOrientation';
import { bufferedWindow, overlapsWindow } from './virtual';
import './timeline.css';

export type { MaRange } from './scale';

/** Which items the timeline shows. Phase 3's filter UI fills this in. */
export interface TimelineFilters {
  /** Show marine reptiles, pterosaurs and other non-dinosaurs (labelled as such). Default false. */
  includeNonDinosaurs?: boolean;
  /** Extra predicate, e.g. diet or continent filters. */
  predicate?: (item: SpeciesIndexEntry) => boolean;
}

/** Imperative controls, reached through the `ref` prop. */
export interface TimelineHandle {
  /**
   * Shows the window from `startMa` (older) to `endMa` (younger) across the viewport, within the
   * zoom limits. Animates briefly unless `animate` is false or the user prefers reduced motion,
   * in which case it jumps.
   */
  zoomTo(range: MaRange, options?: { animate?: boolean }): void;
}

export interface TimelineProps {
  /** Species to plot, from the species index. */
  items: readonly SpeciesIndexEntry[];
  filters?: TimelineFilters;
  /** Called with the slug when a marker is activated (click, Enter or Space). */
  onSelect: (slug: string) => void;
  /**
   * The highlighted species (`aria-current`). On mount the view centres on it; later changes
   * only move the highlight.
   */
  highlightedSlug?: string;
  /** `zoomTo` lives on this handle: `ref.current.zoomTo({ startMa, endMa })`. */
  ref?: Ref<TimelineHandle>;
}

const MESOZOIC = unitById('mesozoic');
const DOMAIN: MaRange = { startMa: MESOZOIC.baseMa, endMa: MESOZOIC.topMa };
const DOMAIN_SPAN = spanMa(DOMAIN);
const RANKS: readonly GeologicRank[] = ['era', 'period', 'epoch', 'stage'];
const UNITS: Record<GeologicRank, GeologicUnit[]> = {
  era: unitsByRank('era').filter((u) => u.id === MESOZOIC.id),
  period: unitsByRank('period'),
  epoch: unitsByRank('epoch'),
  stage: unitsByRank('stage'),
};
const PERIODS = UNITS.period;

function periodOf(unit: GeologicUnit): string | undefined {
  let cur: GeologicUnit | undefined = unit;
  while (cur && cur.rank !== 'period') cur = cur.parent ? unitById(cur.parent) : undefined;
  return cur?.id;
}

const PERIOD_BOUNDARIES = new Set(boundariesOf(PERIODS).map((b) => b.ma));

const bandMeasure = createTextMeasure('12px', 12);
const tickMeasure = createTextMeasure('11px', 11);
const labelMeasure = createTextMeasure('italic 13px', 13);
const famousLabelMeasure = createTextMeasure('italic 600 13px', 13);
const tagMeasure = createTextMeasure('11px', 11);

const NOT_A_DINOSAUR = 'not a dinosaur';

function markerName(item: SpeciesIndexEntry): string {
  const tag = item.isDinosaur ? '' : `, ${NOT_A_DINOSAUR}`;
  return `${item.genus}${tag}, ${formatMa(item.startMa)} to ${formatMa(item.endMa)} million years ago`;
}

function labelWidth(item: SpeciesIndexEntry): number {
  const genus = (item.famous ? famousLabelMeasure : labelMeasure)(item.genus);
  return genus + (item.isDinosaur ? 0 : 6 + tagMeasure(NOT_A_DINOSAUR));
}

/** The opening window around a species: its range (with whiskers) at about a fifth of the view. */
function windowAround(item: SpeciesIndexEntry): MaRange {
  const older = item.startMa + (item.startUncertaintyMa ?? 0);
  const younger = item.endMa - (item.endUncertaintyMa ?? 0);
  const span = Math.max(MIN_VISIBLE_SPAN_MA * 2, (older - younger) * 6);
  const centre = (older + younger) / 2;
  return { startMa: centre + span / 2, endMa: centre - span / 2 };
}

/** Bands for the ranks shown at zoom `kLevel`, each with the longest label that fits. */
function layoutBands(kLevel: number, pxPerMa: number) {
  const ranks = ranksForSpan(DOMAIN_SPAN / kLevel);
  return RANKS.filter((r) => ranks.includes(r)).flatMap((rank) =>
    UNITS[rank].map((unit, i) => {
      // Vertical bands use rotated text, so the room is the band's length either way.
      const size = (unit.baseMa - unit.topMa) * pxPerMa;
      const label = pickLabel(bandLabelCandidates(unit), size - 12, bandMeasure);
      return {
        unit,
        rank,
        label,
        labelSize: label ? bandMeasure(label) + 12 : 0,
        period: periodOf(unit),
        alt: i % 2 === 1,
      };
    }),
  );
}

/** Boundaries of the deepest rank shown, with labels thinned so they don't collide. */
function layoutTicks(kLevel: number, pxPerMa: number, horizontal: boolean) {
  const ranks = ranksForSpan(DOMAIN_SPAN / kLevel);
  const deepest = ranks[ranks.length - 1] ?? 'period';
  const boundaries = boundariesOf(UNITS[deepest]);
  const texts = boundaries.map(formatBoundary);
  const positions = boundaries.map((b) => (DOMAIN.startMa - b.ma) * pxPerMa);
  // Vertical tick labels wrap the "±" part onto a second line.
  const sizes = horizontal ? texts.map((t) => tickMeasure(t) + 4) : texts.map(() => 30);
  const keep = thinLabels(positions, sizes, 10);
  return boundaries.map((b, i) => ({
    boundary: b,
    text: texts[i] ?? '',
    spoken: describeBoundary(b),
    show: keep[i] ?? false,
    edge: b.ma === DOMAIN.startMa ? 'start' : b.ma === DOMAIN.endMa ? 'end' : undefined,
  }));
}

function clampToDomain(ma: number): number {
  return Math.min(DOMAIN.startMa, Math.max(DOMAIN.endMa, ma));
}

interface MarkerProps {
  item: SpeciesIndexEntry;
  /** Lane offset across the time axis, px. */
  cross: number;
  horizontal: boolean;
  highlighted: boolean;
  endAnchored: boolean;
  tabbable: boolean;
  onSelect: (slug: string) => void;
}

/**
 * One species range marker. Memoised, so a commit only re-renders markers whose lane, highlight or
 * tab stop changed. Its time-axis position and bar length are written by the engine, not React.
 */
const Marker = memo(function Marker({
  item,
  cross,
  horizontal,
  highlighted,
  endAnchored,
  tabbable,
  onSelect,
}: MarkerProps) {
  return (
    <button
      type="button"
      className={`tl-marker${item.famous ? ' tl-marker--famous' : ''}${
        endAnchored ? ' tl-marker--end' : ''
      }`}
      tabIndex={tabbable ? 0 : -1}
      style={horizontal ? { top: cross } : { left: cross }}
      aria-label={markerName(item)}
      aria-current={highlighted ? 'true' : undefined}
      data-slug={item.slug}
      data-anchor={endAnchored ? 'end' : undefined}
      data-start-ma={item.startMa}
      data-end-ma={item.endMa}
      data-start-uncertainty-ma={item.startUncertaintyMa}
      data-end-uncertainty-ma={item.endUncertaintyMa}
      onClick={() => {
        onSelect(item.slug);
      }}
    >
      <span className="tl-label">
        <i>{item.genus}</i>
        {!item.isDinosaur && <span className="tl-tag">{NOT_A_DINOSAUR}</span>}
      </span>
      <span className="tl-bar">
        {item.startUncertaintyMa !== undefined && <span className="tl-whisker tl-whisker--start" />}
        {item.endUncertaintyMa !== undefined && <span className="tl-whisker tl-whisker--end" />}
      </span>
    </button>
  );
});

/**
 * The interactive Mesozoic timeline: period, epoch and stage bands with species range markers,
 * zoomed and panned with d3-zoom. Pan and zoom frames are written straight to the DOM by
 * {@link TimelineEngine}; React re-renders only when the zoom level changes or the view settles.
 *
 * `zoomTo` is an imperative handle: pass a `ref` and call `ref.current.zoomTo({ startMa, endMa })`.
 */
export function Timeline({ items, filters, onSelect, highlightedSlug, ref }: TimelineProps) {
  const orientation = useOrientation();
  const horizontal = orientation === 'horizontal';
  const helpId = useId();
  const listId = useId();

  const viewportRef = useRef<HTMLDivElement>(null);
  const laneAreaRef = useRef<HTMLDivElement>(null);
  const bandLayerRef = useRef<HTMLDivElement>(null);
  const gridLayerRef = useRef<HTMLDivElement>(null);
  const crossLayerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TimelineEngine | null>(null);

  const [snap, setSnap] = useState<TimelineSnapshot>({
    k: 1,
    offset: 0,
    length: 1000,
    crossLength: 0,
    cross: 0,
    orientation,
  });
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const firstSnap = useRef(snap);
  const pendingReveal = useRef(true);

  const includeNonDinosaurs = filters?.includeNonDinosaurs ?? false;
  const predicate = filters?.predicate;
  const shown = useMemo(
    () =>
      items
        .filter((it) => (includeNonDinosaurs || it.isDinosaur) && (!predicate || predicate(it)))
        .sort((a, b) => b.startMa - a.startMa || a.genus.localeCompare(b.genus)),
    [items, includeNonDinosaurs, predicate],
  );

  // The initial view, read once on mount.
  const [initialRange] = useState<MaRange>(() => {
    const target = items.find((it) => it.slug === highlightedSlug);
    return target ? windowAround(target) : DOMAIN;
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const laneArea = laneAreaRef.current;
    const bandLayer = bandLayerRef.current;
    const gridLayer = gridLayerRef.current;
    const crossLayer = crossLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!viewport || !laneArea || !bandLayer || !gridLayer || !crossLayer || !markerLayer) {
      return undefined;
    }
    const engine = new TimelineEngine(
      { viewport, laneArea, timeLayers: [bandLayer, gridLayer, markerLayer], crossLayer },
      { domain: DOMAIN, orientation: snap.orientation, onCommit: setSnap },
    );
    engineRef.current = engine;
    engine.zoomTo(initialRange, false, true);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Mount-only: the engine lives as long as the component; later changes go through methods.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    engineRef.current?.setOrientation(orientation);
  }, [orientation]);

  useImperativeHandle(
    ref,
    () => ({
      zoomTo: (range, options) => engineRef.current?.zoomTo(range, options?.animate ?? true),
    }),
    [],
  );

  // ---- Layout for the committed view (recomputed only when React re-renders) ----

  const scale = useMemo(() => createTimeScale(DOMAIN, snap.length), [snap.length]);
  const level = zoomLevel(snap.k);
  const kLevel = levelScale(level);
  const pxPerMa = (kLevel * snap.length) / DOMAIN_SPAN;
  const win = visibleWindow(scale, snap, snap.length);
  const ranks = ranksForSpan(DOMAIN_SPAN / kLevel);

  const packing = useMemo(() => {
    const domainEndPx = DOMAIN_SPAN * pxPerMa;
    const anchors = shown.map((it) =>
      horizontal && (DOMAIN.startMa - it.startMa) * pxPerMa + labelWidth(it) > domainEndPx
        ? 'end'
        : 'start',
    );
    const intervals = shown.map((it, i) =>
      markerInterval({
        startPx: (DOMAIN.startMa - it.startMa) * pxPerMa,
        endPx: (DOMAIN.startMa - it.endMa) * pxPerMa,
        startWhiskerPx: (it.startUncertaintyMa ?? 0) * pxPerMa,
        endWhiskerPx: (it.endUncertaintyMa ?? 0) * pxPerMa,
        labelExtentPx: horizontal ? labelWidth(it) + 4 : VERTICAL_LABEL_EXTENT_PX,
        minBarPx: MIN_BAR_PX,
        anchor: anchors[i] ?? 'start',
      }),
    );
    const { lanes, laneCount } = packLanes(intervals, LANE_GAP_PX);
    return {
      laneOf: new Map(shown.map((it, i) => [it.slug, lanes[i] ?? 0])),
      endAnchored: new Set(shown.filter((_, i) => anchors[i] === 'end').map((it) => it.slug)),
      laneCount,
    };
  }, [shown, pxPerMa, horizontal]);

  const laneSize = horizontal ? LANE_SIZE_PX.horizontal : LANE_SIZE_PX.vertical;
  const crossExtent = packing.laneCount * laneSize + 2 * LANE_PADDING_PX;

  // Virtualised on both axes: the time window and the visible lanes, each ± one viewport.
  const buffered = bufferedWindow(win, 1);
  const crossView = snap.crossLength > 0 ? snap.crossLength : 600;
  const laneInView = (slug: string) => {
    const start = LANE_PADDING_PX + (packing.laneOf.get(slug) ?? 0) * laneSize;
    return start + laneSize >= snap.cross - crossView && start <= snap.cross + 2 * crossView;
  };
  const rendered = shown.filter(
    (it) =>
      (overlapsWindow(it, buffered) && laneInView(it.slug)) ||
      it.slug === highlightedSlug ||
      it.slug === focusedSlug,
  );
  const inView = shown.filter((it) => overlapsWindow(it, win));

  const bands = useMemo(() => layoutBands(kLevel, pxPerMa), [kLevel, pxPerMa]);
  const ticks = useMemo(
    () => layoutTicks(kLevel, pxPerMa, horizontal),
    [kLevel, pxPerMa, horizontal],
  );

  // Hand the freshly rendered nodes to the engine before the browser paints.
  useLayoutEffect(() => {
    const markerLayer = markerLayerRef.current;
    const bandLayer = bandLayerRef.current;
    const gridLayer = gridLayerRef.current;
    if (!markerLayer || !bandLayer || !gridLayer) return;
    const engine = engineRef.current;
    if (!engine) return;
    engine.setNodes({ markerLayer, bandLayers: [bandLayer, gridLayer] }, crossExtent);
    // Once the opening view has rendered, scroll the lanes so the highlighted marker shows.
    if (pendingReveal.current && snap !== firstSnap.current) {
      pendingReveal.current = false;
      const current = markerLayer.querySelector<HTMLElement>('[aria-current="true"]');
      if (current) engine.reveal(current, false);
    }
  });

  const centreMa = (win.startMa + win.endMa) / 2;
  const context = RANKS.filter((r) => r !== 'era' && ranks.includes(r))
    .map((r) => UNITS[r].find((u) => u.baseMa >= centreMa && u.topMa <= centreMa)?.name)
    .filter((n): n is string => n !== undefined);
  const windowLabel = `Showing ${formatMa(clampToDomain(win.startMa))} to ${formatMa(
    clampToDomain(win.endMa),
  )} million years ago${context.length ? ` · ${context.join(', ')}` : ''}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (engineRef.current?.handleKey(event.nativeEvent)) event.preventDefault();
  };

  const onFocusMarker = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    const slug = target.dataset.slug;
    if (slug === undefined) return;
    setFocusedSlug(slug);
    engineRef.current?.reveal(target);
  };

  const zoomBy = (factor: number) => engineRef.current?.zoomBy(factor);
  const zoomTo = (range: MaRange) => engineRef.current?.zoomTo(range);

  return (
    <div className="tl" data-orientation={orientation} data-item-count={shown.length}>
      <div className="tl-toolbar">
        <div role="group" aria-label="Zoom" className="tl-group">
          <button
            type="button"
            className="tl-button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            −
          </button>
          <button
            type="button"
            className="tl-button"
            aria-label="Zoom in"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            +
          </button>
        </div>
        <div role="group" aria-label="Jump to period" className="tl-group">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="tl-button"
              onClick={() => zoomTo({ startMa: p.baseMa, endMa: p.topMa })}
            >
              {p.name}
            </button>
          ))}
          <button type="button" className="tl-button" onClick={() => zoomTo(DOMAIN)}>
            Show whole {MESOZOIC.name}
          </button>
        </div>
        <p className="tl-window" aria-live="polite" data-testid="timeline-window">
          {windowLabel}
        </p>
      </div>

      <div
        ref={viewportRef}
        role="region"
        aria-label={`Timeline of the ${MESOZOIC.name}`}
        aria-describedby={helpId}
        tabIndex={0}
        className="tl-viewport"
        data-testid="timeline-viewport"
        onKeyDown={onKeyDown}
      >
        <div className="tl-bands" aria-hidden="true">
          <div ref={bandLayerRef} className="tl-time-layer">
            {bands.map(({ unit, rank, label, labelSize, period, alt }) => (
              <div
                key={unit.id}
                className={`tl-band tl-band--${rank}${alt ? ' tl-band--alt' : ''}`}
                data-period={period}
                data-testid={`band-${unit.id}`}
                data-band-start-ma={unit.baseMa}
                data-band-end-ma={unit.topMa}
                data-label-size={labelSize}
              >
                {label && <span className="tl-band-label">{label}</span>}
              </div>
            ))}
            {ticks.map(
              ({ boundary, text, show, edge }) =>
                show && (
                  <div
                    key={boundary.ma}
                    className={`tl-tick${edge ? ` tl-tick--${edge}` : ''}`}
                    data-at-ma={boundary.ma}
                  >
                    <span>{text}</span>
                  </div>
                ),
            )}
          </div>
        </div>
        <div ref={laneAreaRef} className="tl-lanes">
          <div ref={gridLayerRef} className="tl-time-layer" aria-hidden="true">
            {ticks.map(({ boundary }) => (
              <div
                key={boundary.ma}
                className={`tl-line${PERIOD_BOUNDARIES.has(boundary.ma) ? ' tl-line--period' : ''}`}
                data-at-ma={boundary.ma}
              />
            ))}
          </div>
          <div ref={crossLayerRef} className="tl-cross-layer">
            <div ref={markerLayerRef} className="tl-time-layer" onFocus={onFocusMarker}>
              {rendered.map((it) => (
                <Marker
                  key={it.slug}
                  item={it}
                  cross={LANE_PADDING_PX + (packing.laneOf.get(it.slug) ?? 0) * laneSize}
                  horizontal={horizontal}
                  highlighted={it.slug === highlightedSlug}
                  endAnchored={packing.endAnchored.has(it.slug)}
                  // Tab walks the markers in view; buffered off-screen ones are reached by panning.
                  tabbable={it.slug === focusedSlug || overlapsWindow(it, win)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <details className="tl-help">
        <summary>Timeline controls</summary>
        <ul id={helpId} role="list">
          <li>
            Drag, or scroll with a mouse wheel or trackpad, to move through time. Pinch, or hold
            Ctrl and scroll, to zoom. Drag across the time axis, or hold Alt and scroll, to see more
            lanes.
          </li>
          <li>On touch screens, drag to move and pinch to zoom.</li>
          <li>
            Keyboard: focus the timeline, then use the arrow keys to move (hold Shift for bigger
            steps), + and − to zoom, and Home or End for the oldest or newest end. Tab moves through
            the species in view, oldest first; Enter or Space selects one.
          </li>
        </ul>
      </details>

      <div className="sr-only">
        <h2 id={listId}>List of species in view</h2>
        <ul role="list" aria-labelledby={listId}>
          {inView.map((it) => (
            <li key={it.slug}>{markerName(it)}</li>
          ))}
        </ul>
        <p>
          Boundaries in view, million years ago:{' '}
          {ticks
            .filter(({ boundary }) => boundary.ma <= win.startMa && boundary.ma >= win.endMa)
            .map(({ spoken }) => spoken)
            .join('; ')}
        </p>
      </div>
    </div>
  );
}

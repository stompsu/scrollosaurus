import {
  memo,
  useEffect,
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
import { useTranslation } from 'react-i18next';
import { BodyPlanIcon } from '@/components/ui/BodyPlanIcon';
import { DietIcon } from '@/components/ui/DietBadge';
import { DIETS } from '@/lib/enums';
import { bodyPlanFor } from '@/components/ui/silhouettes';
import { formatMa, unitById, unitName, unitsByRank } from '@/lib/geologic-time';
import { tr } from '@/lib/i18n';
import { useLang } from '@/lib/lang';
import type { Lang } from '@/lib/locale';
import type { GeologicRank, GeologicUnit } from '@/lib/schemas/geologic-time';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import {
  LANE_GAP_PX,
  LANE_PADDING_PX,
  LANE_SIZE_PX,
  MARKER_BODY_ICON_PX,
  MARKER_DIET_ICON_PX,
  MARKER_ICONS_PX,
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
import { createTextMeasure, onFontsReady, type TextMeasure } from './measure';
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
  /**
   * Zooms to a species' range (animated, as `zoomTo`) and scrolls its lane into view. Does
   * nothing if the species isn't shown under the current filters.
   */
  showSpecies(slug: string, options?: { animate?: boolean }): void;
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
  /** When nothing is highlighted: the species whose marker the opening view scrolls into view. */
  openingSlug?: string;
  /** The opening window, read on mount. Defaults to the window around `highlightedSlug`. */
  initialRange?: MaRange;
  /** Called with the visible window each time the view settles after moving. */
  onViewChange?: (range: MaRange) => void;
  /** Called with the slug of the marker under the pointer or keyboard focus, or null. */
  onPreview?: (slug: string | null) => void;
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

/** Text measurers for the fonts in use. Recreated (and the cache cleared) when web fonts load. */
interface Measures {
  band: TextMeasure;
  tick: TextMeasure;
  label: TextMeasure;
  famousLabel: TextMeasure;
  tag: TextMeasure;
}

function createMeasures(): Measures {
  return {
    band: createTextMeasure('12px', 12),
    tick: createTextMeasure('11px', 11),
    label: createTextMeasure('italic 13px', 13),
    famousLabel: createTextMeasure('italic 600 13px', 13),
    tag: createTextMeasure('11px', 11),
  };
}

function markerName(lang: Lang, item: SpeciesIndexEntry): string {
  const tag = item.isDinosaur ? '' : `, ${tr(lang, 'timeline.notADinosaur')}`;
  return tr(lang, 'timeline.marker', {
    genus: item.genus,
    tag,
    diet: tr(lang, `diet.${item.diet}`).toLowerCase(),
    start: formatMa(lang, item.startMa),
    end: formatMa(lang, item.endMa),
  });
}

/** A marker label's extent along the time axis; the "not a dinosaur" tag's width depends on `lang`. */
function labelWidth(lang: Lang, item: SpeciesIndexEntry, m: Measures): number {
  const genus = (item.famous ? m.famousLabel : m.label)(item.genus);
  return (
    MARKER_ICONS_PX + genus + (item.isDinosaur ? 0 : 6 + m.tag(tr(lang, 'timeline.notADinosaur')))
  );
}

/** The opening window around a species: its range (with whiskers) at about a fifth of the view. */
export function windowAround(item: SpeciesIndexEntry): MaRange {
  const older = item.startMa + (item.startUncertaintyMa ?? 0);
  const younger = item.endMa - (item.endUncertaintyMa ?? 0);
  const span = Math.max(MIN_VISIBLE_SPAN_MA * 2, (older - younger) * 6);
  const centre = (older + younger) / 2;
  return { startMa: centre + span / 2, endMa: centre - span / 2 };
}

/** Bands for the ranks shown at zoom `kLevel`, each with the longest label that fits. */
function layoutBands(lang: Lang, kLevel: number, pxPerMa: number, m: Measures) {
  const ranks = ranksForSpan(DOMAIN_SPAN / kLevel);
  return RANKS.filter((r) => ranks.includes(r)).flatMap((rank) =>
    UNITS[rank].map((unit, i) => {
      // Vertical bands use rotated text, so the room is the band's length either way.
      const size = (unit.baseMa - unit.topMa) * pxPerMa;
      const label = pickLabel(bandLabelCandidates(lang, unit), size - 12, m.band);
      return {
        unit,
        rank,
        label,
        labelSize: label ? m.band(label) + 12 : 0,
        period: periodOf(unit),
        alt: i % 2 === 1,
      };
    }),
  );
}

/** Boundaries of the deepest rank shown, with labels thinned so they don't collide. */
function layoutTicks(
  lang: Lang,
  kLevel: number,
  pxPerMa: number,
  horizontal: boolean,
  m: Measures,
) {
  const ranks = ranksForSpan(DOMAIN_SPAN / kLevel);
  const deepest = ranks[ranks.length - 1] ?? 'period';
  const boundaries = boundariesOf(UNITS[deepest]);
  const texts = boundaries.map((b) => formatBoundary(lang, b));
  const positions = boundaries.map((b) => (DOMAIN.startMa - b.ma) * pxPerMa);
  // Vertical tick labels wrap the "±" part onto a second line.
  const sizes = horizontal ? texts.map((t) => m.tick(t) + 4) : texts.map(() => 30);
  const keep = thinLabels(positions, sizes, 10);
  return boundaries.map((b, i) => ({
    boundary: b,
    text: texts[i] ?? '',
    spoken: describeBoundary(lang, b),
    show: keep[i] ?? false,
    edge: b.ma === DOMAIN.startMa ? 'start' : b.ma === DOMAIN.endMa ? 'end' : undefined,
  }));
}

function clampToDomain(ma: number): number {
  return Math.min(DOMAIN.startMa, Math.max(DOMAIN.endMa, ma));
}

/**
 * Names the units in view, coarsest first: "Triassic to Cretaceous", or "Cretaceous, Early
 * Cretaceous, Barremian to Aptian". A finer rank is added only under a single coarser unit, and
 * only when it doesn't just list all of that unit's children.
 */
export function windowContext(lang: Lang, range: MaRange, ranks: readonly GeologicRank[]): string {
  const start = clampToDomain(range.startMa);
  const end = clampToDomain(range.endMa);
  // Ignore slivers (rounding at exact boundaries, e.g. after a period jump).
  const minOverlap = (start - end) * 0.002;
  const parts: string[] = [];
  let parent: GeologicUnit | undefined;
  for (const rank of RANKS) {
    if (rank === 'era' || !ranks.includes(rank)) continue;
    if (parts.length > 0 && !parent) break;
    const units = UNITS[rank].filter(
      (u) => Math.min(u.baseMa, start) - Math.max(u.topMa, end) > minOverlap,
    );
    const first = units[0];
    const last = units[units.length - 1];
    if (!first || !last) break;
    if (parent && units.length > 1) {
      const parentId = parent.id;
      const siblings = UNITS[rank].filter((u) => u.parent === parentId);
      if (siblings.length === units.length) break;
    }
    parts.push(
      first === last
        ? unitName(lang, first)
        : tr(lang, 'timeline.unitRange', {
            first: unitName(lang, first),
            last: unitName(lang, last),
          }),
    );
    parent = first === last ? first : undefined;
  }
  return parts.join(', ');
}

/** Whether the timeline shows `item` under `filters` (non-dinosaurs are hidden by default). */
export function matchesFilters(item: SpeciesIndexEntry, filters?: TimelineFilters): boolean {
  return (
    (filters?.includeNonDinosaurs === true || item.isDinosaur) &&
    (filters?.predicate === undefined || filters.predicate(item))
  );
}

interface MarkerProps {
  item: SpeciesIndexEntry;
  /** The page language: a prop, so the memoised marker re-renders when it changes. */
  lang: Lang;
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
  lang,
  cross,
  horizontal,
  highlighted,
  endAnchored,
  tabbable,
  onSelect,
}: MarkerProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`tl-marker${item.famous ? ' tl-marker--famous' : ''}${
        endAnchored ? ' tl-marker--end' : ''
      }`}
      tabIndex={tabbable ? 0 : -1}
      style={horizontal ? { top: cross } : { left: cross }}
      aria-label={markerName(lang, item)}
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
        {/* Diet and body plan at a glance; the marker's accessible name says the diet in words. */}
        <span className="tl-icons">
          <DietIcon diet={item.diet} size={MARKER_DIET_ICON_PX} />
          <BodyPlanIcon
            plan={bodyPlanFor(item.groupPath)}
            width={MARKER_BODY_ICON_PX.width}
            height={MARKER_BODY_ICON_PX.height}
          />
        </span>
        <i>{item.genus}</i>
        {!item.isDinosaur && <span className="tl-tag">{t('timeline.notADinosaur')}</span>}
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
export function Timeline({
  items,
  filters,
  onSelect,
  highlightedSlug,
  openingSlug,
  initialRange: initialRangeProp,
  onViewChange,
  onPreview,
  ref,
}: TimelineProps) {
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
  const parallaxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TimelineEngine | null>(null);

  const [snap, setSnap] = useState<TimelineSnapshot>({
    k: 1,
    offset: 0,
    length: 1000,
    crossLength: 0,
    cross: 0,
    orientation,
    settled: false,
  });
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const firstSnap = useRef(snap);
  // Bumped when web fonts finish loading, so cached text widths are re-measured.
  const [measures, setMeasures] = useState(createMeasures);
  useEffect(
    () =>
      onFontsReady(() => {
        setMeasures(createMeasures());
      }),
    [],
  );
  const pendingReveal = useRef(true);
  /** A marker to scroll into view across the lanes once it has rendered (after showSpecies). */
  const revealSlug = useRef<string | null>(null);

  const includeNonDinosaurs = filters?.includeNonDinosaurs ?? false;
  const predicate = filters?.predicate;
  const lang = useLang();
  const { t } = useTranslation();
  /** Diets that appear among the items, in the usual order, for the icon legend. */
  const legendDiets = useMemo(
    () => DIETS.filter((d) => items.some((it) => it.diet === d)),
    [items],
  );
  const shown = useMemo(
    () =>
      items
        .filter((it) =>
          matchesFilters(it, {
            includeNonDinosaurs,
            ...(predicate === undefined ? {} : { predicate }),
          }),
        )
        .sort((a, b) => b.startMa - a.startMa || a.genus.localeCompare(b.genus)),
    [items, includeNonDinosaurs, predicate],
  );

  // The initial view, read once on mount.
  const [initialRange] = useState<MaRange>(() => {
    if (initialRangeProp) return initialRangeProp;
    const target = shown.find((it) => it.slug === highlightedSlug);
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
    const parallaxLayers = [
      ...(parallaxRef.current?.querySelectorAll<HTMLElement>('[data-factor]') ?? []),
    ];
    const engine = new TimelineEngine(
      {
        viewport,
        laneArea,
        timeLayers: [bandLayer, gridLayer, markerLayer],
        crossLayer,
        parallaxLayers,
      },
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

  // Read by the imperative handle, which is created once.
  const shownRef = useRef(shown);
  useLayoutEffect(() => {
    shownRef.current = shown;
  });

  useImperativeHandle(
    ref,
    () => ({
      zoomTo: (range, options) => engineRef.current?.zoomTo(range, options?.animate ?? true),
      showSpecies: (slug, options) => {
        const item = shownRef.current.find((it) => it.slug === slug);
        const engine = engineRef.current;
        if (!item || !engine) return;
        revealSlug.current = slug;
        engine.zoomTo(windowAround(item), options?.animate ?? true);
      },
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
      horizontal &&
      (DOMAIN.startMa - it.startMa) * pxPerMa + labelWidth(lang, it, measures) > domainEndPx
        ? 'end'
        : 'start',
    );
    const intervals = shown.map((it, i) =>
      markerInterval({
        startPx: (DOMAIN.startMa - it.startMa) * pxPerMa,
        endPx: (DOMAIN.startMa - it.endMa) * pxPerMa,
        startWhiskerPx: (it.startUncertaintyMa ?? 0) * pxPerMa,
        endWhiskerPx: (it.endUncertaintyMa ?? 0) * pxPerMa,
        labelExtentPx: horizontal ? labelWidth(lang, it, measures) + 4 : VERTICAL_LABEL_EXTENT_PX,
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
  }, [lang, shown, pxPerMa, horizontal, measures]);

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
  const laneVisible = (slug: string) => {
    const start = LANE_PADDING_PX + (packing.laneOf.get(slug) ?? 0) * laneSize;
    return start + laneSize > snap.cross && start < snap.cross + crossView;
  };
  const inView = shown.filter((it) => overlapsWindow(it, win) && laneVisible(it.slug));

  const bands = useMemo(
    () => layoutBands(lang, kLevel, pxPerMa, measures),
    [lang, kLevel, pxPerMa, measures],
  );
  const ticks = useMemo(
    () => layoutTicks(lang, kLevel, pxPerMa, horizontal, measures),
    [lang, kLevel, pxPerMa, horizontal, measures],
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
    // Once the opening view has rendered, scroll the lanes so the highlighted (or opening) marker
    // shows.
    if (pendingReveal.current && snap !== firstSnap.current) {
      pendingReveal.current = false;
      const current =
        markerLayer.querySelector<HTMLElement>('[aria-current="true"]') ??
        (openingSlug === undefined
          ? null
          : markerLayer.querySelector<HTMLElement>(`[data-slug="${CSS.escape(openingSlug)}"]`));
      if (current) engine.reveal(current, false);
    }
    if (revealSlug.current !== null) {
      const el = markerLayer.querySelector<HTMLElement>(
        `[data-slug="${CSS.escape(revealSlug.current)}"]`,
      );
      if (el) {
        revealSlug.current = null;
        engine.reveal(el, false);
      }
    }
  });

  const context = windowContext(lang, win, ranks);
  const windowLabel = `${t('timeline.showing', {
    start: formatMa(lang, clampToDomain(win.startMa)),
    end: formatMa(lang, clampToDomain(win.endMa)),
  })}${context ? ` · ${context}` : ''}`;
  // Screen readers hear the window only once the view has settled, not on every commit.
  const [liveLabel, setLiveLabel] = useState('');
  if (snap.settled && liveLabel !== windowLabel) setLiveLabel(windowLabel);

  // Report settled windows (not every frame) so the page can keep the URL in step.
  const onViewChangeRef = useRef(onViewChange);
  useLayoutEffect(() => {
    onViewChangeRef.current = onViewChange;
  });
  const settledStart = snap.settled ? win.startMa : undefined;
  const settledEnd = snap.settled ? win.endMa : undefined;
  useEffect(() => {
    if (settledStart === undefined || settledEnd === undefined) return;
    onViewChangeRef.current?.({ startMa: settledStart, endMa: settledEnd });
  }, [settledStart, settledEnd]);

  const onPreviewRef = useRef(onPreview);
  useLayoutEffect(() => {
    onPreviewRef.current = onPreview;
  });
  const previewSlug = useRef<string | null>(null);
  const preview = (slug: string | null) => {
    if (previewSlug.current === slug) return;
    previewSlug.current = slug;
    onPreviewRef.current?.(slug);
  };
  const markerSlug = (target: EventTarget | null): string | null =>
    target instanceof Element
      ? (target.closest<HTMLElement>('[data-slug]')?.dataset.slug ?? null)
      : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (engineRef.current?.handleKey(event.nativeEvent)) event.preventDefault();
  };

  const onFocusMarker = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    const slug = target.dataset.slug;
    if (slug === undefined) return;
    setFocusedSlug(slug);
    preview(slug);
    // Only keyboard focus scrolls the marker into view. A mouse or touch press also focuses it,
    // and moving it then would pull the button out from under the pointer before the click lands.
    if (target.matches(':focus-visible')) engineRef.current?.reveal(target);
  };

  const onBlurMarker = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setFocusedSlug(null);
      preview(null);
    }
  };

  const zoomBy = (factor: number) => engineRef.current?.zoomBy(factor);
  const zoomTo = (range: MaRange) => engineRef.current?.zoomTo(range);

  return (
    <div className="tl" data-orientation={orientation} data-item-count={shown.length}>
      <div className="tl-toolbar">
        <div role="group" aria-label={t('timeline.zoom')} className="tl-group">
          <button
            type="button"
            className="tl-button"
            aria-label={t('timeline.zoomOut')}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            −
          </button>
          <button
            type="button"
            className="tl-button"
            aria-label={t('timeline.zoomIn')}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            +
          </button>
        </div>
        <div role="group" aria-label={t('timeline.jump')} className="tl-group">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="tl-button"
              onClick={() => zoomTo({ startMa: p.baseMa, endMa: p.topMa })}
            >
              {unitName(lang, p)}
            </button>
          ))}
          <button type="button" className="tl-button" onClick={() => zoomTo(DOMAIN)}>
            {t('timeline.showWhole', { era: unitName(lang, MESOZOIC) })}
          </button>
        </div>
        <p className="tl-window" data-testid="timeline-window">
          {windowLabel}
        </p>
        <p className="sr-only" aria-live="polite" data-testid="timeline-live">
          {liveLabel}
        </p>
      </div>

      <div
        ref={viewportRef}
        role="region"
        aria-label={t('timeline.region', { era: unitName(lang, MESOZOIC) })}
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
          {/* Decorative parallax: sediment strata and plants, slower than the timeline. */}
          <div ref={parallaxRef} className="tl-parallax" aria-hidden="true">
            <div className="tl-parallax-strata" data-factor="0.25" data-tile="480" />
            <div className="tl-parallax-plants" data-factor="0.55" data-tile="600" />
          </div>
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
            <div
              ref={markerLayerRef}
              className="tl-time-layer"
              onFocus={onFocusMarker}
              onBlur={onBlurMarker}
              onPointerOver={(e) => {
                // Not while a button is held: a drag-pan would re-render for every marker it crosses.
                if (e.pointerType === 'mouse' && e.buttons === 0) preview(markerSlug(e.target));
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') preview(focusedSlug);
              }}
            >
              {rendered.map((it) => (
                <Marker
                  key={it.slug}
                  item={it}
                  lang={lang}
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

      {/* The marker icons in words: each diet icon with its name (icon + text, never icon alone). */}
      <div className="tl-legend">
        <span>{t('timeline.legend')}</span>
        <ul role="list">
          {legendDiets.map((d) => (
            <li key={d}>
              <DietIcon diet={d} size={MARKER_DIET_ICON_PX} />
              {t(`diet.${d}`)}
            </li>
          ))}
        </ul>
      </div>

      <details className="tl-help">
        <summary>{t('timeline.help')}</summary>
        <ul id={helpId} role="list">
          <li>{t('timeline.helpPointer')}</li>
          <li>{t('timeline.helpTouch')}</li>
          <li>{t('timeline.helpKeyboard')}</li>
        </ul>
      </details>

      <div className="sr-only">
        <h2 id={listId}>{t('timeline.listInView')}</h2>
        <ul role="list" aria-labelledby={listId}>
          {inView.map((it) => (
            <li key={it.slug}>{markerName(lang, it)}</li>
          ))}
        </ul>
        <p>
          {t('timeline.boundariesInView')}{' '}
          {ticks
            .filter(({ boundary }) => boundary.ma <= win.startMa && boundary.ma >= win.endMa)
            .map(({ spoken }) => spoken)
            .join('; ')}
        </p>
      </div>
    </div>
  );
}

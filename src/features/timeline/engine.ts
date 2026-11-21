import { select, type Selection } from 'd3-selection';
import {
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from 'd3-zoom';
import {
  KEY_PAN_FRACTION,
  LANE_PADDING_PX,
  LANE_SIZE_PX,
  MIN_BAR_PX,
  MIN_VISIBLE_SPAN_MA,
  PAN_MARGIN_PX,
  ZOOM_ANIMATION_MS,
  ZOOM_STEP,
  COMMIT_DEBOUNCE_MS,
} from './config';
import {
  clamp,
  clampOffset,
  createTimeScale,
  maxZoom,
  pxToMa,
  spanMa,
  transformAroundCentre,
  transformForWindow,
  visibleWindow,
  type AxisTransform,
  type MaRange,
  type TimeScale,
} from './scale';
import { zoomLevel } from './semantic';

export type Orientation = 'horizontal' | 'vertical';

/** What React renders from. Changes on zoom-level changes and, debounced, when the view moves. */
export interface TimelineSnapshot extends AxisTransform {
  length: number;
  crossLength: number;
  orientation: Orientation;
}

export interface EngineElements {
  /** The focusable region; d3-zoom, wheel and keyboard input attach here. */
  viewport: HTMLElement;
  /** The lane area, whose cross-axis size limits lane scrolling. */
  laneArea: HTMLElement;
  /** Layers translated along the time axis every frame (bands, grid lines, markers). */
  timeLayers: HTMLElement[];
  /** Layer translated across the time axis to scroll lanes. */
  crossLayer: HTMLElement;
}

interface MarkerNode {
  el: HTMLElement;
  bar: HTMLElement | null;
  startWhisker: HTMLElement | null;
  endWhisker: HTMLElement | null;
  s: number;
  e: number;
  us: number;
  ue: number;
  /** Label anchored at the bar end: the element is placed at the bar end and shifted back by CSS. */
  endAnchored: boolean;
}

interface BandNode {
  el: HTMLElement;
  label: HTMLElement | null;
  labelSize: number;
  shift: number;
  s: number;
  e: number;
}

interface PointNode {
  el: HTMLElement;
  s: number;
}

/** Fallback viewport length when the element has no layout yet (e.g. jsdom in unit tests). */
const FALLBACK_LENGTH = 1000;

const num = (value: string | undefined): number => (value === undefined ? 0 : Number(value));

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeInOutCubic = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** Frame-time instrumentation, only compiled into perf-fixture builds (`VITE_PERF_FIXTURE=1`). */
interface PerfWindow {
  __timelineApplyMs?: number[];
  __timelineCommits?: number;
}

/**
 * The imperative half of the timeline. d3-zoom owns the transform; every input event updates it,
 * and one `requestAnimationFrame` per frame writes CSS transforms and sizes straight to the DOM.
 * React is told to re-render only through `onCommit`, which fires when the discrete zoom level
 * changes, when the view has drifted half a viewport from the last render, or after the view has
 * rested for {@link COMMIT_DEBOUNCE_MS}.
 */
export class TimelineEngine {
  readonly kMax: number;
  private readonly els: EngineElements;
  private readonly domain: MaRange;
  private readonly onCommit: (s: TimelineSnapshot) => void;
  private readonly zoom: ZoomBehavior<HTMLElement, unknown>;
  private readonly sel: Selection<HTMLElement, unknown, null, undefined>;
  private readonly resizeObserver: ResizeObserver | null;

  private orientation: Orientation;
  private length = FALLBACK_LENGTH;
  private crossLength = 0;
  private scale: TimeScale;
  private t: AxisTransform = { k: 1, offset: 0 };
  private cross = 0;
  private crossExtent = 0;
  private centreMa: number;

  private markers: MarkerNode[] = [];
  private bands: BandNode[] = [];
  private points: PointNode[] = [];
  private appliedK = Number.NaN;
  private appliedLength = Number.NaN;

  private raf = 0;
  private tweenRaf = 0;
  private commitTimer: ReturnType<typeof setTimeout> | undefined;
  private committed: {
    level: number;
    centre: number;
    span: number;
    snap: TimelineSnapshot;
  } | null = null;
  private drag: { pos: number; cross: number } | null = null;
  private destroyed = false;

  constructor(
    els: EngineElements,
    options: {
      domain: MaRange;
      orientation: Orientation;
      onCommit: (s: TimelineSnapshot) => void;
    },
  ) {
    this.els = els;
    this.domain = options.domain;
    this.orientation = options.orientation;
    this.onCommit = options.onCommit;
    this.kMax = maxZoom(this.domain, MIN_VISIBLE_SPAN_MA);
    this.centreMa = (this.domain.startMa + this.domain.endMa) / 2;
    this.measureSize();
    this.scale = createTimeScale(this.domain, this.length);

    this.zoom = zoom<HTMLElement, unknown>()
      .scaleExtent([1, this.kMax])
      // Wheel is handled below (plain wheel pans, Ctrl/pinch zooms); double-click zoom is off so
      // double-clicking a marker doesn't zoom. Secondary mouse buttons are ignored.
      .filter(
        (event: Event) =>
          event.type !== 'wheel' &&
          event.type !== 'dblclick' &&
          !(event instanceof MouseEvent && event.button !== 0),
      )
      .constrain((t) => this.constrain(t))
      .on('start', (ev: D3ZoomEvent<HTMLElement, unknown>) => {
        this.onZoomStart(ev);
      })
      .on('zoom', (ev: D3ZoomEvent<HTMLElement, unknown>) => {
        this.onZoom(ev);
      })
      .on('end', () => {
        this.drag = null;
        this.scheduleTrailingCommit();
      });
    this.sel = select(els.viewport);
    this.sel.call(this.zoom).on('dblclick.zoom', null);
    els.viewport.addEventListener('wheel', this.onWheel, { passive: false });

    this.resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            this.relayout();
          })
        : null;
    this.resizeObserver?.observe(els.viewport);
    this.resizeObserver?.observe(els.laneArea);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.tweenRaf);
    clearTimeout(this.commitTimer);
    this.resizeObserver?.disconnect();
    this.els.viewport.removeEventListener('wheel', this.onWheel);
    this.sel.on('.zoom', null);
  }

  get snapshot(): TimelineSnapshot {
    return {
      k: this.t.k,
      offset: this.t.offset,
      length: this.length,
      crossLength: this.crossLength,
      orientation: this.orientation,
    };
  }

  private get horizontal(): boolean {
    return this.orientation === 'horizontal';
  }

  // ---- Layout -------------------------------------------------------------------------------

  private measureSize(): void {
    const { viewport, laneArea } = this.els;
    const length = this.horizontal ? viewport.clientWidth : viewport.clientHeight;
    this.length = length > 0 ? length : FALLBACK_LENGTH;
    this.crossLength = this.horizontal ? laneArea.clientHeight : laneArea.clientWidth;
  }

  /** Call after the orientation or size changed. Keeps the same Ma in the centre and the same zoom. */
  setOrientation(orientation: Orientation): void {
    if (orientation === this.orientation) return;
    this.orientation = orientation;
    this.cross = 0;
    this.relayout(true);
  }

  private relayout(force = false): void {
    if (this.destroyed) return;
    const before = { length: this.length, crossLength: this.crossLength };
    this.measureSize();
    if (!force && before.length === this.length && before.crossLength === this.crossLength) return;
    this.scale = createTimeScale(this.domain, this.length);
    this.setTransform(
      transformAroundCentre(this.scale, this.length, this.centreMa, this.t.k, PAN_MARGIN_PX),
      true,
    );
  }

  /** After React renders: picks up the rendered nodes and the lanes' total cross-axis size. */
  setNodes(
    nodes: { markerLayer: HTMLElement; bandLayers: HTMLElement[] },
    crossExtent: number,
  ): void {
    const s = this.scale;
    const pxPerMa = this.length / spanMa(this.domain);
    this.markers = Array.from(
      nodes.markerLayer.querySelectorAll<HTMLElement>('[data-start-ma]'),
      (el): MarkerNode => ({
        el,
        bar: el.querySelector<HTMLElement>('.tl-bar'),
        startWhisker: el.querySelector<HTMLElement>('.tl-whisker--start'),
        endWhisker: el.querySelector<HTMLElement>('.tl-whisker--end'),
        endAnchored: el.dataset.anchor === 'end',
        s: s(num(el.dataset.startMa)),
        e: s(num(el.dataset.endMa)),
        us: num(el.dataset.startUncertaintyMa) * pxPerMa,
        ue: num(el.dataset.endUncertaintyMa) * pxPerMa,
      }),
    );
    this.bands = [];
    this.points = [];
    for (const layer of nodes.bandLayers) {
      for (const el of layer.querySelectorAll<HTMLElement>('[data-band-start-ma]')) {
        const label = el.querySelector<HTMLElement>('.tl-band-label');
        label?.style.removeProperty('transform');
        this.bands.push({
          el,
          label,
          labelSize: label ? (this.horizontal ? label.offsetWidth : label.offsetHeight) : 0,
          shift: 0,
          s: s(num(el.dataset.bandStartMa)),
          e: s(num(el.dataset.bandEndMa)),
        });
      }
      for (const el of layer.querySelectorAll<HTMLElement>('[data-at-ma]')) {
        this.points.push({ el, s: s(num(el.dataset.atMa)) });
      }
    }
    this.crossExtent = crossExtent;
    this.cross = this.clampCross(this.cross);
    this.appliedK = Number.NaN;
    this.apply();
  }

  // ---- Per-frame rendering ------------------------------------------------------------------

  private schedule(): void {
    if (this.raf === 0 && !this.destroyed) {
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.apply();
        this.maybeCommit();
      });
    }
  }

  /** Applies the current transform now, and tells React to re-render right away. */
  private flush(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.apply();
    this.commit();
  }

  private apply(): void {
    const t0 = import.meta.env.VITE_PERF_FIXTURE === '1' ? performance.now() : 0;
    const { k, offset } = this.t;
    const h = this.horizontal;
    const timeTransform = h ? `translate3d(${offset}px,0,0)` : `translate3d(0,${offset}px,0)`;
    for (const layer of this.els.timeLayers) layer.style.transform = timeTransform;
    this.els.crossLayer.style.transform = h
      ? `translate3d(0,${-this.cross}px,0)`
      : `translate3d(${-this.cross}px,0,0)`;

    // Panning only moves the layers above. Positions and sizes inside them change only with k.
    if (k !== this.appliedK || this.length !== this.appliedLength) {
      this.appliedK = k;
      this.appliedLength = this.length;
      const size = h ? 'width' : 'height';
      for (const m of this.markers) {
        const bar = Math.max(MIN_BAR_PX, k * (m.e - m.s));
        const pos = k * m.s + (m.endAnchored ? bar : 0);
        m.el.style.transform = h ? `translate3d(${pos}px,0,0)` : `translate3d(0,${pos}px,0)`;
        if (m.bar) m.bar.style[size] = `${bar}px`;
        if (m.startWhisker) m.startWhisker.style[size] = `${k * m.us}px`;
        if (m.endWhisker) m.endWhisker.style[size] = `${k * m.ue}px`;
      }
      for (const b of this.bands) {
        const pos = k * b.s;
        b.el.style.transform = h ? `translate3d(${pos}px,0,0)` : `translate3d(0,${pos}px,0)`;
        b.el.style[size] = `${k * (b.e - b.s)}px`;
      }
      for (const p of this.points) {
        const pos = k * p.s;
        p.el.style.transform = h ? `translate3d(${pos}px,0,0)` : `translate3d(0,${pos}px,0)`;
      }
    }

    // Band labels stick to the viewport's start edge while their band is partly off screen.
    for (const b of this.bands) {
      if (!b.label) continue;
      const start = k * b.s + offset;
      const shift = Math.round(clamp(-start, 0, Math.max(0, k * (b.e - b.s) - b.labelSize - 8)));
      if (shift !== b.shift) {
        b.shift = shift;
        b.label.style.transform = h ? `translateX(${shift}px)` : `translateY(${shift}px)`;
      }
    }

    this.centreMa = pxToMa(this.scale, this.t, this.length / 2);
    if (import.meta.env.VITE_PERF_FIXTURE === '1') {
      ((window as PerfWindow).__timelineApplyMs ??= []).push(performance.now() - t0);
    }
  }

  // ---- React commits ------------------------------------------------------------------------

  private commit(): void {
    clearTimeout(this.commitTimer);
    const win = visibleWindow(this.scale, this.t, this.length);
    const snap = this.snapshot;
    this.committed = {
      level: zoomLevel(this.t.k),
      centre: (win.startMa + win.endMa) / 2,
      span: spanMa(win),
      snap,
    };
    if (import.meta.env.VITE_PERF_FIXTURE === '1') {
      const w = window as PerfWindow;
      w.__timelineCommits = (w.__timelineCommits ?? 0) + 1;
    }
    this.onCommit(snap);
  }

  private maybeCommit(): void {
    const c = this.committed;
    if (c === null) {
      this.commit();
      return;
    }
    const win = visibleWindow(this.scale, this.t, this.length);
    const centre = (win.startMa + win.endMa) / 2;
    if (zoomLevel(this.t.k) !== c.level || Math.abs(centre - c.centre) > c.span / 2) {
      this.commit();
    } else {
      this.scheduleTrailingCommit();
    }
  }

  private scheduleTrailingCommit(): void {
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      const c = this.committed?.snap;
      const s = this.snapshot;
      if (c === undefined) {
        this.commit();
        return;
      }
      if (c.k !== s.k || c.offset !== s.offset || c.length !== s.length) this.commit();
    }, COMMIT_DEBOUNCE_MS);
  }

  // ---- Transform state ----------------------------------------------------------------------

  private toZoom(t: AxisTransform): ZoomTransform {
    return this.horizontal
      ? zoomIdentity.translate(t.offset, 0).scale(t.k)
      : zoomIdentity.translate(0, t.offset).scale(t.k);
  }

  private constrain(t: ZoomTransform): ZoomTransform {
    const offset = clampOffset(this.horizontal ? t.x : t.y, t.k, this.length, PAN_MARGIN_PX);
    return this.toZoom({ k: t.k, offset });
  }

  private onZoomStart(ev: D3ZoomEvent<HTMLElement, unknown>): void {
    const source = ev.sourceEvent as Event | null;
    if (!source) return;
    this.cancelTween();
    const pos = this.crossPointer(source);
    this.drag = pos === null ? null : { pos, cross: this.cross };
  }

  private onZoom(ev: D3ZoomEvent<HTMLElement, unknown>): void {
    const t = ev.transform;
    this.t = { k: t.k, offset: this.horizontal ? t.x : t.y };
    const source = ev.sourceEvent as Event | null;
    if (this.drag && source) {
      // d3-zoom pans the time axis; the other drag component scrolls the lanes.
      const pos = this.crossPointer(source);
      if (pos === null) this.drag = null;
      else this.cross = this.clampCross(this.drag.cross - (pos - this.drag.pos));
    }
    this.schedule();
  }

  /** Pointer position across the time axis, for single-pointer drags only. */
  private crossPointer(event: Event): number | null {
    if (event instanceof MouseEvent) return this.horizontal ? event.clientY : event.clientX;
    if (typeof TouchEvent === 'function' && event instanceof TouchEvent) {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      if (!touch) return null;
      return this.horizontal ? touch.clientY : touch.clientX;
    }
    return null;
  }

  private clampCross(value: number): number {
    return clamp(value, 0, Math.max(0, this.crossExtent - this.crossLength));
  }

  /** Sets the transform. `immediate` applies it and re-renders React now instead of next frame. */
  private setTransform(t: AxisTransform, immediate = false): void {
    this.zoom.transform(this.sel, this.toZoom(t));
    if (immediate) this.flush();
    else this.schedule();
  }

  private cancelTween(): void {
    cancelAnimationFrame(this.tweenRaf);
    this.tweenRaf = 0;
  }

  /** Moves to `target`, animated unless `animate` is false or the user prefers reduced motion. */
  private moveTo(target: AxisTransform, animate: boolean, immediate = false): void {
    this.cancelTween();
    if (!animate || prefersReducedMotion()) {
      this.setTransform(target, immediate);
      return;
    }
    const from = { k: this.t.k, centre: this.centreMa };
    const to = {
      k: target.k,
      centre: pxToMa(this.scale, target, this.length / 2),
    };
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / ZOOM_ANIMATION_MS);
      const e = easeInOutCubic(u);
      const k = from.k * (to.k / from.k) ** e;
      const centre = from.centre + (to.centre - from.centre) * e;
      this.zoom.transform(
        this.sel,
        this.toZoom(transformAroundCentre(this.scale, this.length, centre, k, PAN_MARGIN_PX)),
      );
      if (u < 1) {
        this.tweenRaf = requestAnimationFrame(step);
      } else {
        this.tweenRaf = 0;
        this.zoom.transform(this.sel, this.toZoom(target));
        this.flush();
      }
    };
    this.tweenRaf = requestAnimationFrame(step);
  }

  // ---- Public commands ----------------------------------------------------------------------

  /**
   * Shows `range` across the viewport (within the zoom limits). With `animate` false, `immediate`
   * also renders synchronously (used for the initial view, so the first paint is already right).
   */
  zoomTo(range: MaRange, animate = true, immediate = false): void {
    this.moveTo(
      transformForWindow(this.scale, this.length, range, this.kMax, PAN_MARGIN_PX),
      animate,
      immediate,
    );
  }

  /** Zooms about the centre of the view. */
  zoomBy(factor: number, animate = true): void {
    const k = clamp(this.t.k * factor, 1, this.kMax);
    this.moveTo(
      transformAroundCentre(this.scale, this.length, this.centreMa, k, PAN_MARGIN_PX),
      animate,
    );
  }

  /** Pans the time axis by `px` screen pixels (positive moves towards younger ages). */
  panBy(px: number): void {
    this.cancelTween();
    this.setTransform({
      k: this.t.k,
      offset: clampOffset(this.t.offset - px, this.t.k, this.length, PAN_MARGIN_PX),
    });
  }

  panCrossBy(px: number): void {
    this.cross = this.clampCross(this.cross + px);
    this.schedule();
  }

  /** Brings a focused marker into view along both axes. */
  reveal(el: HTMLElement): void {
    const node = this.markers.find((m) => m.el === el);
    if (!node) return;
    const { k, offset } = this.t;
    const h = this.horizontal;
    const pad = 24;
    const start = k * node.s + offset;
    const extent = Math.max(
      Math.max(MIN_BAR_PX, k * (node.e - node.s)),
      h ? el.offsetWidth : el.offsetHeight,
    );
    if (start < pad || start + extent > this.length - pad) {
      const target =
        extent > this.length - 2 * pad
          ? pad - k * node.s
          : this.length / 2 - k * node.s - extent / 2;
      this.cancelTween();
      this.zoom.transform(this.sel, this.toZoom({ k, offset: target }));
    }
    const laneStart = h ? el.offsetTop : el.offsetLeft;
    const laneEnd = laneStart + (h ? el.offsetHeight : el.offsetWidth);
    if (laneStart < this.cross) {
      this.cross = this.clampCross(laneStart - LANE_PADDING_PX);
    } else if (laneEnd > this.cross + this.crossLength) {
      this.cross = this.clampCross(laneEnd - this.crossLength + LANE_PADDING_PX);
    }
    this.flush();
  }

  /** Keyboard model for the focused region. Returns true when the key was handled. */
  handleKey(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    const h = this.horizontal;
    const step = this.length * KEY_PAN_FRACTION * (event.shiftKey ? 5 : 1);
    const crossStep = (h ? LANE_SIZE_PX.horizontal : LANE_SIZE_PX.vertical) * 2;
    switch (event.key) {
      case h ? 'ArrowLeft' : 'ArrowUp':
        this.panBy(-step);
        return true;
      case h ? 'ArrowRight' : 'ArrowDown':
        this.panBy(step);
        return true;
      case h ? 'ArrowUp' : 'ArrowLeft':
        this.panCrossBy(-crossStep);
        return true;
      case h ? 'ArrowDown' : 'ArrowRight':
        this.panCrossBy(crossStep);
        return true;
      case '+':
      case '=':
        this.zoomBy(ZOOM_STEP, false);
        return true;
      case '-':
      case '_':
        this.zoomBy(1 / ZOOM_STEP, false);
        return true;
      case 'Home':
        this.cancelTween();
        this.setTransform({ k: this.t.k, offset: 0 });
        return true;
      case 'End':
        this.cancelTween();
        this.setTransform({ k: this.t.k, offset: this.length - this.t.k * this.length });
        return true;
      default:
        return false;
    }
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.cancelTween();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.length : 1;
    const dx = event.deltaX * unit;
    const dy = event.deltaY * unit;
    if (event.ctrlKey || event.metaKey) {
      // Trackpad pinch arrives as ctrl+wheel with small deltas; cap mouse-wheel notches.
      const exponent = clamp(-dy * 0.01, -0.5, 0.5);
      const rect = this.els.viewport.getBoundingClientRect();
      const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
      this.zoom.scaleBy(this.sel, 2 ** exponent, point);
      return;
    }
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (event.altKey) {
      this.panCrossBy(delta);
      return;
    }
    const { k } = this.t;
    this.zoom.translateBy(
      this.sel,
      this.horizontal ? -delta / k : 0,
      this.horizontal ? 0 : -delta / k,
    );
  };
}

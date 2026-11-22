import { unitById } from './geologic-time';
import { groupFilterOptions } from './groups';
import { CONTINENTS, DIETS, PERIOD_IDS, type Continent, type Diet, type PeriodId } from './enums';
import { SIZE_CLASSES, SIZE_UNKNOWN, type SizeFilter } from './size-class';
import type { SpeciesIndexEntry } from './species-index';

/**
 * The shareable view: filters and the visible time window, kept in the URL query string so every
 * view is a link. The selected species lives in the path (/species/:slug), not here.
 *
 *   ?diet=carnivore,piscivore&group=theropoda&period=jurassic&size=giant,unknown
 *    &continent=asia&famous=1&nondino=1&from=160.25&to=140.5
 *
 * Within a filter the values are alternatives (OR); different filters combine with AND.
 */
export interface SpeciesFilters {
  diets: Diet[];
  groups: string[];
  periods: PeriodId[];
  sizes: SizeFilter[];
  continents: Continent[];
  famousOnly: boolean;
  /** Show pterosaurs, marine reptiles and other non-dinosaurs, labelled "not a dinosaur". Off by default. */
  nonDinosaurs: boolean;
}

export interface TimeWindow {
  /** Older edge, Ma. */
  startMa: number;
  /** Younger edge, Ma. */
  endMa: number;
}

export interface ViewState {
  filters: SpeciesFilters;
  window?: TimeWindow;
  /** The guided tour's step, 1-based (`?tour=2`); absent when the tour is closed. */
  tour?: number;
}

export const EMPTY_FILTERS: SpeciesFilters = {
  diets: [],
  groups: [],
  periods: [],
  sizes: [],
  continents: [],
  famousOnly: false,
  nonDinosaurs: false,
};

const SIZE_VALUES: readonly SizeFilter[] = [...SIZE_CLASSES.map((c) => c.id), SIZE_UNKNOWN];
const GROUP_VALUES: readonly string[] = groupFilterOptions().map((g) => g.id);

/** Window edges are written to 0.01 Ma, enough to restore the view to well under a pixel. */
const WINDOW_DECIMALS = 2;

/** Known values from a comma list, deduplicated and in the canonical order of `allowed`. */
function listParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  const raw = new Set(
    params
      .getAll(key)
      .flatMap((v) => v.split(','))
      .map((v) => v.trim()),
  );
  return allowed.filter((v) => raw.has(v));
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseViewState(params: URLSearchParams): ViewState {
  const filters: SpeciesFilters = {
    diets: listParam(params, 'diet', DIETS),
    groups: listParam(params, 'group', GROUP_VALUES),
    periods: listParam(params, 'period', PERIOD_IDS),
    sizes: listParam(params, 'size', SIZE_VALUES),
    continents: listParam(params, 'continent', CONTINENTS),
    famousOnly: params.get('famous') === '1',
    nonDinosaurs: params.get('nondino') === '1',
  };
  const startMa = numberParam(params, 'from');
  const endMa = numberParam(params, 'to');
  const tourRaw = numberParam(params, 'tour');
  const tour =
    tourRaw !== undefined && Number.isInteger(tourRaw) && tourRaw >= 1 ? tourRaw : undefined;
  const window =
    startMa !== undefined && endMa !== undefined ? clampWindow({ startMa, endMa }) : undefined;
  return {
    filters,
    ...(window ? { window } : {}),
    ...(tour === undefined ? {} : { tour }),
  };
}

const MESOZOIC = unitById('mesozoic');

/** The window limited to the Mesozoic; undefined if nothing of it is left or it's inverted. */
export function clampWindow(w: TimeWindow): TimeWindow | undefined {
  const startMa = Math.min(w.startMa, MESOZOIC.baseMa);
  const endMa = Math.max(w.endMa, MESOZOIC.topMa);
  return startMa > endMa ? { startMa, endMa } : undefined;
}

function roundMa(ma: number): string {
  return String(Number(ma.toFixed(WINDOW_DECIMALS)));
}

/** The query string for a view, in a fixed key order. Empty filters are left out. */
export function serializeViewState(state: ViewState): URLSearchParams {
  const { filters: f, window, tour } = state;
  const params = new URLSearchParams();
  const list = (key: string, values: readonly string[]) => {
    if (values.length > 0) params.set(key, values.join(','));
  };
  list('diet', f.diets);
  list('group', f.groups);
  list('period', f.periods);
  list('size', f.sizes);
  list('continent', f.continents);
  if (f.famousOnly) params.set('famous', '1');
  if (f.nonDinosaurs) params.set('nondino', '1');
  if (tour !== undefined) params.set('tour', String(tour));
  const clamped = window && clampWindow(window);
  if (clamped) {
    params.set('from', roundMa(clamped.startMa));
    params.set('to', roundMa(clamped.endMa));
  }
  return params;
}

/** `?a=1,2` reads better than `?a=1%2C2`; commas are safe in a query string. */
export function queryString(params: URLSearchParams): string {
  const s = params.toString().replace(/%2C/gi, ',');
  return s ? `?${s}` : '';
}

/** Number of active filter values, for the "Filters (3)" button. The non-dinosaur layer isn't counted. */
export function activeFilterCount(f: SpeciesFilters): number {
  return (
    f.diets.length +
    f.groups.length +
    f.periods.length +
    f.sizes.length +
    f.continents.length +
    (f.famousOnly ? 1 : 0)
  );
}

const intersects = <T>(a: readonly T[], b: readonly T[]) => a.some((v) => b.includes(v));

/** The filters except the non-dinosaur layer, which the timeline applies itself. */
export function matchesAttributeFilters(item: SpeciesIndexEntry, f: SpeciesFilters): boolean {
  if (f.diets.length > 0 && !f.diets.includes(item.diet)) return false;
  if (f.groups.length > 0 && !intersects(f.groups, item.groupPath)) return false;
  if (f.periods.length > 0 && !intersects(f.periods, item.periods)) return false;
  if (f.continents.length > 0 && !intersects(f.continents, item.continents)) return false;
  if (f.famousOnly && !item.famous) return false;
  if (f.sizes.length > 0) {
    const unknownOk = f.sizes.includes(SIZE_UNKNOWN) && item.sizeClasses.length === 0;
    if (!unknownOk && !intersects<SizeFilter>(f.sizes, item.sizeClasses)) return false;
  }
  return true;
}

/** Whether `item` is shown under `f`, including the non-dinosaur layer. */
export function matchesSpeciesFilters(item: SpeciesIndexEntry, f: SpeciesFilters): boolean {
  return (f.nonDinosaurs || item.isDinosaur) && matchesAttributeFilters(item, f);
}

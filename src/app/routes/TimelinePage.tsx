import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  Navigate,
  NavigationType,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
  useSearchParams,
} from 'react-router';
import { FilterPanel, SearchBox } from '@/features/filters';
import { SpeciesCard, SpeciesDrawer, type HiddenReason } from '@/features/species';
import {
  Timeline,
  usePerfFixture,
  windowAround,
  type MaRange,
  type TimelineFilters,
  type TimelineHandle,
} from '@/features/timeline';
import { formatMaRounded, unitById } from '@/lib/geologic-time';
import { primarySpeciesSlug, species } from '@/lib/species';
import {
  matchesAttributeFilters,
  matchesSpeciesFilters,
  parseViewState,
  queryString,
  serializeViewState,
  type SpeciesFilters,
} from '@/lib/view-state';
import NotFoundPage from './NotFoundPage';

interface RevealState {
  /** Zoom the timeline to the species once the route changes (search, "Lived alongside"). */
  reveal?: boolean;
}

function filterKey(filters: SpeciesFilters): string {
  return queryString(serializeViewState({ filters }));
}

function speciesPath(slug: string, search: string): string {
  return `/species/${slug}${search}`;
}

function sameWindow(a: MaRange | undefined, b: MaRange | undefined): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.startMa - b.startMa) < 0.01 && Math.abs(a.endMa - b.endMa) < 0.01;
}

/**
 * The timeline page, at `/` and `/species/:slug`. Everything a link needs to reproduce the view is
 * in the URL: the selected species in the path; filters and the visible window in the query.
 * The page stays mounted between the two paths, so the timeline keeps its place.
 */
export default function TimelinePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const timelineRef = useRef<TimelineHandle>(null);
  const items = usePerfFixture(species);
  const mesozoic = unitById('mesozoic');

  const search = location.search;
  const view = useMemo(() => parseViewState(new URLSearchParams(search)), [search]);
  // The query string as last written. navigate() commits asynchronously, so two quick writes
  // (a filter change, then a window update) must build on this, not on window.location.
  const latestSearch = useRef(search);
  useLayoutEffect(() => {
    latestSearch.current = search;
  }, [search]);
  // The URL updates a moment after a checkbox changes; until then show the new filters, so the
  // checkbox doesn't flick back. Tied to the history entry it was made on, so it is ignored as
  // soon as the location changes (the write landing, Back, Forward or any other navigation).
  const [pending, setPending] = useState<{ filters: SpeciesFilters; key: string } | null>(null);
  const live = pending?.key === location.key ? pending.filters : view.filters;
  const liveKey = filterKey(live);
  // Stable while the filters are unchanged, so the timeline doesn't re-filter on window updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => live, [liveKey]);

  const selected = slug === undefined ? undefined : items.find((s) => s.slug === slug);
  const hidden: HiddenReason | undefined = !selected
    ? undefined
    : !selected.isDinosaur && !filters.nonDinosaurs
      ? 'non-dinosaur'
      : !matchesAttributeFilters(selected, filters)
        ? 'filters'
        : undefined;
  const primary = items.find((s) => s.slug === primarySpeciesSlug);
  const highlighted = selected ? (hidden ? undefined : selected.slug) : primarySpeciesSlug;

  const timelineFilters = useMemo<TimelineFilters>(
    () => ({
      includeNonDinosaurs: filters.nonDinosaurs,
      predicate: (item) => matchesAttributeFilters(item, filters),
    }),
    [filters],
  );
  const shownCount = useMemo(
    () => items.filter((s) => matchesSpeciesFilters(s, filters)).length,
    [items, filters],
  );
  const layerCount = useMemo(
    () => items.filter((s) => filters.nonDinosaurs || s.isDinosaur).length,
    [items, filters.nonDinosaurs],
  );

  // Read once by the timeline on mount: the URL's window, else the selected or primary species.
  const [initialRange] = useState<MaRange | undefined>(() => {
    if (view.window) return view.window;
    const target = selected && !hidden ? selected : primary;
    return target ? windowAround(target) : undefined;
  });

  /** Writes filters and/or window into the query string, keeping the path. */
  const writeView = useCallback(
    (update: { filters?: SpeciesFilters; window?: MaRange }) => {
      const current = parseViewState(new URLSearchParams(latestSearch.current));
      const next = queryString(
        serializeViewState({
          filters: update.filters ?? current.filters,
          ...((update.window ?? current.window) ? { window: update.window ?? current.window } : {}),
        }),
      );
      if (next === latestSearch.current) return;
      latestSearch.current = next;
      void navigate({ search: next }, { replace: true, preventScrollReset: true });
    },
    [navigate],
  );

  // The last window the timeline reported (or opened on), to tell Back/Forward moves apart.
  const shownWindow = useRef<MaRange | undefined>(initialRange);
  const onViewChange = useCallback(
    (range: MaRange) => {
      shownWindow.current = range;
      writeView({ window: range });
    },
    [writeView],
  );

  const openSpecies = useCallback(
    (next: string, reveal: boolean) => {
      const state: RevealState = { reveal };
      void navigate(speciesPath(next, latestSearch.current), { state });
    },
    [navigate],
  );

  const onSelect = useCallback(
    (next: string) => {
      openSpecies(next, false);
    },
    [openSpecies],
  );

  // Closing replaces the species entry, so Back after closing leaves the page instead of
  // reopening the drawer.
  const closeDrawer = useCallback(() => {
    void navigate(`/${latestSearch.current}`, { replace: true });
  }, [navigate]);

  // Search and "Lived alongside" move the timeline to the species they open.
  const reveal = (location.state as RevealState | null)?.reveal === true;
  // Only when the link is followed: Back to that entry restores its own stored window instead.
  useEffect(() => {
    if (slug !== undefined && reveal && navigationType !== NavigationType.Pop) {
      timelineRef.current?.showSpecies(slug);
    }
  }, [slug, reveal, location.key, navigationType]);

  // Back and Forward restore the window stored in that history entry.
  useEffect(() => {
    if (
      navigationType !== NavigationType.Pop ||
      !view.window ||
      sameWindow(view.window, shownWindow.current)
    ) {
      return;
    }
    shownWindow.current = view.window;
    timelineRef.current?.zoomTo(view.window, { animate: false });
    // Only on a new history entry; view.window changes with every settled pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // After "Show animals that weren't dinosaurs" in the drawer, move to the now-visible species.
  const showOnceVisible = useRef<string | null>(null);
  useEffect(() => {
    if (showOnceVisible.current !== slug) {
      showOnceVisible.current = null;
      return;
    }
    if (hidden !== undefined) return;
    showOnceVisible.current = null;
    timelineRef.current?.showSpecies(slug);
  }, [hidden, slug]);

  // When the drawer closes, put focus back where it came from, or on the timeline.
  const lastSlug = useRef(slug);
  useEffect(() => {
    const was = lastSlug.current;
    lastSlug.current = slug;
    if (was === undefined || slug !== undefined) return;
    const active = document.activeElement;
    if (active && active !== document.body && document.contains(active)) return;
    const marker = document.querySelector<HTMLElement>(`[data-slug="${CSS.escape(was)}"]`);
    (marker ?? document.querySelector<HTMLElement>('[data-testid="timeline-viewport"]'))?.focus();
  }, [slug]);

  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  // The card under the timeline: the marker under the pointer or focus, else the highlighted
  // species if the filters show it.
  const previewed = items.find(
    (s) => s.slug === (previewSlug ?? highlighted) && matchesSpeciesFilters(s, filters),
  );

  // Old links: /?species=x → /species/x.
  const legacy = slug === undefined ? params.get('species') : null;
  if (legacy !== null) {
    const rest = new URLSearchParams(params);
    rest.delete('species');
    return <Navigate replace to={speciesPath(legacy, queryString(rest))} />;
  }
  if (slug !== undefined && !selected) return <NotFoundPage />;

  const hrefFor = (other: string) => speciesPath(other, search);

  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      {!selected && <title>Scrollosaurus: dinosaurs on a timeline of the Mesozoic</title>}
      <h1 id="home-title" className="font-display text-xl">
        The {mesozoic.name}, {formatMaRounded(mesozoic.baseMa)} to {formatMaRounded(mesozoic.topMa)}{' '}
        million years ago
      </h1>

      <div className="sc-controls">
        <SearchBox
          items={items}
          onPick={(next) => {
            openSpecies(next, true);
          }}
        />
        <FilterPanel
          filters={filters}
          onChange={(next) => {
            setPending({ filters: next, key: location.key });
            writeView({ filters: next });
          }}
          shownCount={shownCount}
          totalCount={layerCount}
        />
      </div>

      <Timeline
        ref={timelineRef}
        items={items}
        filters={timelineFilters}
        onSelect={onSelect}
        {...(highlighted === undefined ? {} : { highlightedSlug: highlighted })}
        {...(initialRange ? { initialRange } : {})}
        onViewChange={onViewChange}
        onPreview={setPreviewSlug}
      />

      {previewed && (
        <section aria-label="Species preview" data-testid="species-preview">
          <SpeciesCard
            item={previewed}
            action={
              <Link
                to={hrefFor(previewed.slug)}
                className="sc-link-button"
                data-testid="preview-details"
              >
                Details<span className="sr-only"> about {previewed.genus}</span>
              </Link>
            }
          />
        </section>
      )}

      {selected && (
        <SpeciesDrawer
          key="drawer"
          item={selected}
          all={items}
          {...(hidden ? { hidden } : {})}
          hrefFor={hrefFor}
          onClose={closeDrawer}
          onShowNonDinosaurs={() => {
            showOnceVisible.current = selected.slug;
            const next = { ...filters, nonDinosaurs: true };
            setPending({ filters: next, key: location.key });
            writeView({ filters: next });
          }}
        />
      )}
    </section>
  );
}

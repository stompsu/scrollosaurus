import { useId, useState, type ReactNode } from 'react';
import { DietIcon } from '@/components/ui/DietBadge';
import { groupFilterOptions } from '@/lib/groups';
import { CONTINENT_LABELS, DIET_LABELS, PERIOD_LABELS } from '@/lib/labels';
import { CONTINENTS, DIETS, PERIOD_IDS } from '@/lib/enums';
import { SIZE_CLASSES, SIZE_UNKNOWN, type SizeFilter } from '@/lib/size-class';
import { activeFilterCount, EMPTY_FILTERS, type SpeciesFilters } from '@/lib/view-state';

const GROUP_OPTIONS = groupFilterOptions();

type ListKey = 'diets' | 'groups' | 'periods' | 'sizes' | 'continents';

interface FilterPanelProps {
  filters: SpeciesFilters;
  onChange: (filters: SpeciesFilters) => void;
  /** Species shown on the timeline under the current filters. */
  shownCount: number;
  /** Species available with the current layer choice (dinosaurs only, or all). */
  totalCount: number;
}

function toggle<T>(list: readonly T[], value: T, on: boolean): T[] {
  return on ? [...list, value] : list.filter((v) => v !== value);
}

function Check({
  checked,
  onChange,
  children,
  nested = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  nested?: boolean;
}) {
  return (
    <label className={`sc-check${nested ? ' sc-check--nested' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      <span>{children}</span>
    </label>
  );
}

/**
 * The filter bar: the "not a dinosaur" layer switch and a disclosure with diet, group, period,
 * size and continent filters. Options within a filter are alternatives; filters combine.
 */
export function FilterPanel({ filters, onChange, shownCount, totalCount }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const active = activeFilterCount(filters);

  // Keep each list in its canonical order, so the URL is the same however it was built.
  const ORDER: Record<ListKey, readonly string[]> = {
    diets: DIETS,
    groups: GROUP_OPTIONS.map((g) => g.id),
    periods: PERIOD_IDS,
    sizes: [...SIZE_CLASSES.map((c) => c.id), SIZE_UNKNOWN],
    continents: CONTINENTS,
  };
  const setList = (key: ListKey, value: string, on: boolean) => {
    const next = toggle<string>(filters[key], value, on);
    const ordered = ORDER[key].filter((v) => next.includes(v));
    onChange({ ...filters, [key]: ordered });
  };
  const has = (key: ListKey, value: string) => (filters[key] as readonly string[]).includes(value);
  const noun = filters.nonDinosaurs ? 'species' : 'dinosaurs';

  return (
    <div className="sc-filters">
      <div className="sc-filter-bar">
        <label className="sc-switch">
          <input
            type="checkbox"
            role="switch"
            checked={filters.nonDinosaurs}
            onChange={(e) => {
              onChange({ ...filters, nonDinosaurs: e.target.checked });
            }}
            data-testid="non-dinosaur-switch"
          />
          <span>
            Show animals that weren’t dinosaurs{' '}
            <span className="text-text-muted">(pterosaurs, marine reptiles)</span>
          </span>
        </label>
        <button
          type="button"
          className="sc-button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((o) => !o);
          }}
          data-testid="filters-toggle"
        >
          Filters{active > 0 ? ` (${String(active)})` : ''}
        </button>
        <p className="sc-filter-count" aria-live="polite" data-testid="filter-count">
          Showing {shownCount} of {totalCount} {noun}
        </p>
      </div>

      <div id={panelId} className="sc-filter-panel" hidden={!open}>
        <fieldset>
          <legend>Diet</legend>
          {DIETS.map((d) => (
            <Check
              key={d}
              checked={has('diets', d)}
              onChange={(on) => {
                setList('diets', d, on);
              }}
            >
              <span className="sc-badge" data-diet={d}>
                <DietIcon diet={d} />
                {DIET_LABELS[d].label}
              </span>
              {DIET_LABELS[d].hint && (
                <span className="text-text-muted"> ({DIET_LABELS[d].hint})</span>
              )}
            </Check>
          ))}
        </fieldset>

        <fieldset>
          <legend>Group</legend>
          {GROUP_OPTIONS.map((g) => (
            <Check
              key={g.id}
              nested={g.clade !== undefined}
              checked={has('groups', g.id)}
              onChange={(on) => {
                setList('groups', g.id, on);
              }}
            >
              {g.name}
            </Check>
          ))}
        </fieldset>

        <fieldset>
          <legend>Period</legend>
          {PERIOD_IDS.map((p) => (
            <Check
              key={p}
              checked={has('periods', p)}
              onChange={(on) => {
                setList('periods', p, on);
              }}
            >
              {PERIOD_LABELS[p]}
            </Check>
          ))}
        </fieldset>

        <fieldset>
          <legend>Size (body length)</legend>
          {SIZE_CLASSES.map((c) => (
            <Check
              key={c.id}
              checked={has('sizes', c.id)}
              onChange={(on) => {
                setList('sizes', c.id, on);
              }}
            >
              {c.label} <span className="text-text-muted">({c.description})</span>
            </Check>
          ))}
          <Check
            checked={has('sizes', SIZE_UNKNOWN satisfies SizeFilter)}
            onChange={(on) => {
              setList('sizes', SIZE_UNKNOWN, on);
            }}
          >
            Size unknown
          </Check>
          <p className="sc-note">A species whose length estimates span two sizes counts in both.</p>
        </fieldset>

        <fieldset>
          <legend>Continent</legend>
          {CONTINENTS.map((c) => (
            <Check
              key={c}
              checked={has('continents', c)}
              onChange={(on) => {
                setList('continents', c, on);
              }}
            >
              {CONTINENT_LABELS[c]}
            </Check>
          ))}
        </fieldset>

        <fieldset>
          <legend>More</legend>
          <Check
            checked={filters.famousOnly}
            onChange={(on) => {
              onChange({ ...filters, famousOnly: on });
            }}
          >
            Famous only
          </Check>
        </fieldset>

        <button
          type="button"
          className="sc-button"
          disabled={active === 0}
          onClick={() => {
            onChange({ ...EMPTY_FILTERS, nonDinosaurs: filters.nonDinosaurs });
          }}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

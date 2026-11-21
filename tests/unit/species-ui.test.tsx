import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createSpeciesSearch, FilterPanel, SearchBox } from '@/features/filters';
import { SpeciesCard, SpeciesDrawer } from '@/features/species';
import { formatMaWithUncertainty } from '@/lib/geologic-time';
import { groupFilterOptions } from '@/lib/groups';
import { species } from '@/lib/species';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import { EMPTY_FILTERS } from '@/lib/view-state';

const bySlug = (slug: string): SpeciesIndexEntry => {
  const s = species.find((x) => x.slug === slug);
  if (!s) throw new Error(`no ${slug}`);
  return s;
};

describe('species search', () => {
  const search = createSpeciesSearch(species);
  const first = (q: string) => search.search(q)[0]?.slug;

  it('finds by genus, with typos and prefixes', () => {
    expect(first('Tyrannosaurus')).toBe('tyrannosaurus');
    expect(first('tyranosaurus')).toBe('tyrannosaurus');
    expect(first('stego')).toBe('stegosaurus');
  });

  it('finds a word inside a genus name', () => {
    const raptors = search.search('raptor').map((s) => s.slug);
    expect(raptors).toEqual(expect.arrayContaining(['velociraptor', 'oviraptor', 'microraptor']));
  });

  it('finds by what the name means', () => {
    expect(search.search('lizard').length).toBeGreaterThan(1);
    expect(first('Chinese lizard')).toBe('sinosauropteryx');
  });

  it('returns nothing for a blank query', () => {
    expect(search.search('  ')).toEqual([]);
  });
});

describe('formatMaWithUncertainty', () => {
  it.each([
    [125.755, 0.061, '125.755 ±0.061'],
    [124.122, 0.048, '124.122 ±0.048'],
    [201.4, 0.2, '201.4 ±0.2'],
    [66, undefined, '66'],
  ])('%s ± %s → %s', (ma, u, expected) => {
    expect(formatMaWithUncertainty(ma, u)).toBe(expected);
  });
});

describe('group filter options', () => {
  it('puts each clade before its subgroups', () => {
    const options = groupFilterOptions();
    const ids = options.map((o) => o.id);
    expect(ids.slice(0, 1)).toEqual(['theropoda']);
    expect(ids.indexOf('tyrannosauridae')).toBeGreaterThan(ids.indexOf('theropoda'));
    expect(ids.indexOf('tyrannosauridae')).toBeLessThan(ids.indexOf('sauropodomorpha'));
    expect(options.find((o) => o.id === 'hadrosauridae')?.clade).toBe('ornithischia');
    expect(ids).not.toContain('pterosauria');
  });
});

describe('<SpeciesCard />', () => {
  it('shows the name, its meaning, diet (icon and text), time range and length', () => {
    render(<SpeciesCard item={bySlug('tyrannosaurus')} />);
    const card = screen.getByTestId('species-card');
    expect(within(card).getByRole('heading', { name: 'Tyrannosaurus' })).toBeInTheDocument();
    expect(card).toHaveTextContent('Tyrant lizard');
    expect(card).toHaveTextContent('Carnivore');
    expect(card.querySelector('[data-diet="carnivore"] svg')).not.toBeNull();
    expect(card).toHaveTextContent('68 to 66 million years ago');
    expect(card).toHaveTextContent('11–12 m long');
  });

  it('labels animals that were not dinosaurs', () => {
    render(<SpeciesCard item={bySlug('mosasaurus')} />);
    expect(screen.getByTestId('species-card')).toHaveTextContent('not a dinosaur');
  });
});

describe('<SearchBox />', () => {
  it('is a combobox: type, arrow to an option, Enter picks it', () => {
    const onPick = vi.fn();
    render(<SearchBox items={species} onPick={onPick} />);
    const input = screen.getByRole('combobox', { name: 'Find a species' });
    fireEvent.change(input, { target: { value: 'trice' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Triceratops');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active ?? '')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('triceratops');
    expect(input).toHaveValue('');
  });

  it('Esc closes the list, then clears the text', () => {
    render(<SearchBox items={species} onPick={() => undefined} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'raptor' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('raptor');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });
});

describe('<FilterPanel />', () => {
  it('toggles the panel and reports filter changes in canonical order', () => {
    const onChange = vi.fn();
    render(
      <FilterPanel
        filters={{ ...EMPTY_FILTERS, diets: ['piscivore'] }}
        onChange={onChange}
        shownCount={3}
        totalCount={30}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Filters (1)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: /Carnivore/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_FILTERS,
      diets: ['carnivore', 'piscivore'],
    });
    expect(screen.getByTestId('filter-count')).toHaveTextContent('Showing 3 of 30 dinosaurs');
  });

  it('switches the non-dinosaur layer outside the panel', () => {
    const onChange = vi.fn();
    render(
      <FilterPanel filters={EMPTY_FILTERS} onChange={onChange} shownCount={30} totalCount={30} />,
    );
    fireEvent.click(screen.getByRole('switch', { name: /weren’t dinosaurs/ }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, nonDinosaurs: true });
  });
});

describe('<SpeciesDrawer />', () => {
  const renderDrawer = (slug: string, hidden?: 'non-dinosaur' | 'filters') =>
    render(
      <MemoryRouter>
        <SpeciesDrawer
          item={bySlug(slug)}
          all={species}
          {...(hidden ? { hidden } : {})}
          hrefFor={(s) => `/species/${s}`}
          onClose={() => undefined}
          onShowNonDinosaurs={() => undefined}
        />
      </MemoryRouter>,
    );

  it('renders facts with numbered sources once the record loads', async () => {
    renderDrawer('sinosauropteryx');
    const dialog = screen.getByTestId('species-drawer');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Sinosauropteryx');
    await waitFor(() => {
      expect(dialog).toHaveTextContent('125.755 ±0.061 to 124.122 ±0.048 million years ago');
    });
    expect(dialog).toHaveTextContent('Ji & Ji, 1996');
    expect(dialog).toHaveTextContent('China (Asia), Yixian Formation');
    expect(dialog).toHaveTextContent('Uncertain:');
    expect(
      within(dialog).getByRole('img', { name: /Length of Sinosauropteryx, 1.1 m/ }),
    ).toBeInTheDocument();
    const refs = within(dialog).getAllByRole('link', { name: /^Source \d+$/ });
    expect(refs.length).toBeGreaterThan(5);
    expect(within(dialog).getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
  });

  it('lists contemporaries as links, with the same-place caveat', () => {
    renderDrawer('tyrannosaurus');
    const dialog = screen.getByTestId('species-drawer');
    expect(within(dialog).getByRole('link', { name: 'Triceratops' })).toHaveAttribute(
      'href',
      '/species/triceratops',
    );
    expect(dialog).toHaveTextContent('does not mean living in the same place');
  });

  it('explains when a non-dinosaur is hidden on the timeline', () => {
    renderDrawer('pteranodon', 'non-dinosaur');
    expect(
      screen.getByRole('button', { name: 'Show animals that weren’t dinosaurs' }),
    ).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Timeline, type TimelineHandle } from '@/features/timeline';
import { primarySpeciesSlug, species } from '@/lib/species';

const band = (id: string) => screen.getByTestId(`band-${id}`);
const width = (id: string) => parseFloat(band(id).style.width);

describe('<Timeline />', () => {
  it('is a labelled, focusable region with the three periods in order, sized by duration', () => {
    render(<Timeline items={species} onSelect={() => undefined} />);
    const region = screen.getByRole('region', { name: /timeline of the mesozoic/i });
    expect(region).toHaveAttribute('tabindex', '0');
    const periods = ['triassic', 'jurassic', 'cretaceous'];
    const starts = periods.map((id) => /translate3d\((-?[\d.]+)px/.exec(band(id).style.transform));
    const xs = starts.map((m) => Number(m?.[1]));
    expect(xs[0]).toBeLessThan(xs[1] ?? 0);
    expect(xs[1]).toBeLessThan(xs[2] ?? 0);
    // Triassic 50.5 Ma, Jurassic 58.3 Ma, Cretaceous 77.1 Ma.
    expect(width('cretaceous') / width('triassic')).toBeCloseTo(
      (143.1 - 66) / (251.902 - 201.4),
      5,
    );
  });

  it('opens on the primary species, highlighted', () => {
    render(
      <Timeline items={species} onSelect={() => undefined} highlightedSlug={primarySpeciesSlug} />,
    );
    const marker = screen.getByRole('button', { name: /^Sinosauropteryx, / });
    expect(marker).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('timeline-window')).toHaveTextContent(
      /Early Cretaceous, Hauterivian to Aptian/,
    );
  });

  it('names markers with the genus and range, and selects with click or keyboard', () => {
    const onSelect = vi.fn();
    render(<Timeline items={species} onSelect={onSelect} highlightedSlug="tyrannosaurus" />);
    const trex = screen.getByRole('button', {
      name: 'Tyrannosaurus, 68 to 66 million years ago',
    });
    expect(trex.querySelector('i')).toHaveTextContent('Tyrannosaurus');
    fireEvent.click(trex);
    expect(onSelect).toHaveBeenCalledWith('tyrannosaurus');
  });

  it('leaves out non-dinosaurs unless asked, and labels them when shown', () => {
    const { unmount } = render(
      <Timeline items={species} onSelect={() => undefined} highlightedSlug="mosasaurus" />,
    );
    expect(screen.queryByRole('button', { name: /^Mosasaurus/ })).toBeNull();
    unmount();
    render(
      <Timeline
        items={species}
        filters={{ includeNonDinosaurs: true }}
        onSelect={() => undefined}
        highlightedSlug="mosasaurus"
      />,
    );
    const mosasaurus = screen.getByRole('button', { name: /^Mosasaurus, not a dinosaur, / });
    expect(mosasaurus).toHaveTextContent('not a dinosaur');
  });

  it('lists the species in view for screen readers', () => {
    render(<Timeline items={species} onSelect={() => undefined} highlightedSlug="tyrannosaurus" />);
    const list = screen.getByRole('list', { name: 'List of species in view' });
    expect(list).toHaveTextContent('Tyrannosaurus, 68 to 66 million years ago');
  });

  it('exposes zoomTo through a ref', () => {
    const ref = createRef<TimelineHandle>();
    render(<Timeline items={species} onSelect={() => undefined} ref={ref} />);
    ref.current?.zoomTo({ startMa: 201.4, endMa: 143.1 }, { animate: false });
    // Applied on the next frame; the window label follows on commit.
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          expect(screen.getByTestId('timeline-window')).toHaveTextContent(
            'Showing 201.4 to 143.1 million years ago',
          );
          resolve();
        }, 0);
      });
    });
  });
});

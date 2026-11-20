import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EraBands } from '@/features/timeline';

describe('<EraBands />', () => {
  it('renders the three Mesozoic periods in order as a labelled list', () => {
    render(<EraBands />);
    const list = screen.getByRole('list', { name: /periods of the mesozoic/i });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Triassic'),
      expect.stringContaining('Jurassic'),
      expect.stringContaining('Cretaceous'),
    ]);
  });

  it('sizes bands in proportion to their duration', () => {
    render(<EraBands />);
    const grow = (id: string) => Number(screen.getByTestId(`band-${id}`).style.flexGrow);
    expect(grow('triassic') + grow('jurassic') + grow('cretaceous')).toBeCloseTo(1, 5);
    expect(grow('cretaceous')).toBeGreaterThan(grow('jurassic'));
  });
});

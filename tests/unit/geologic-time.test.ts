import { describe, expect, it } from 'vitest';
import rawGeologicTime from '../../data/geologic-time.json';
import { formatMa, geologicTime, unitsByRank } from '@/lib/geologic-time';
import { geologicTimeSchema } from '@/lib/schemas/geologic-time';

describe('geologic-time data', () => {
  it('records the ICS chart version', () => {
    expect(geologicTime.chart.version).toMatch(/^v\d{4}\/\d{2}$/);
  });

  it('lists Mesozoic periods oldest first and contiguous', () => {
    const periods = unitsByRank('period');
    expect(periods.map((p) => p.id)).toEqual(['triassic', 'jurassic', 'cretaceous']);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]?.baseMa).toBe(periods[i - 1]?.topMa);
    }
  });
});

describe('geologicTimeSchema', () => {
  const clone = () => structuredClone(rawGeologicTime);

  it('rejects a gap between sibling periods', () => {
    const data = clone();
    const jurassic = data.units.find((u) => u.id === 'jurassic');
    if (!jurassic) throw new Error('fixture missing jurassic');
    jurassic.baseMa = 200;
    expect(geologicTimeSchema.safeParse(data).success).toBe(false);
  });

  it('rejects a unit whose base is younger than its top', () => {
    const data = clone();
    const triassic = data.units.find((u) => u.id === 'triassic');
    if (!triassic) throw new Error('fixture missing triassic');
    triassic.topMa = 260;
    expect(geologicTimeSchema.safeParse(data).success).toBe(false);
  });

  it('rejects an unknown parent', () => {
    const data = clone();
    const period = data.units[1];
    if (!period) throw new Error('fixture missing period');
    data.units.push({ ...period, id: 'orphan', parent: 'paleozoic' });
    expect(geologicTimeSchema.safeParse(data).success).toBe(false);
  });
});

describe('formatMa', () => {
  it.each([
    [251.902, '251.9'],
    [201.4, '201.4'],
    [66, '66'],
    [143.04, '143'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatMa(input)).toBe(expected);
  });
});

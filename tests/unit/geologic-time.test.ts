import { describe, expect, it } from 'vitest';
import rawGeologicTime from '../../data/geologic-time.json';
import {
  formatMa,
  formatMaRounded,
  geologicTime,
  unitById,
  unitsByRank,
} from '@/lib/geologic-time';
import { geologicTimeSchema } from '@/lib/schemas/geologic-time';

type Data = typeof rawGeologicTime;
type Unit = Data['units'][number] & { parent?: string };

const clone = (): Data => structuredClone(rawGeologicTime);

function unit(data: Data, id: string): Unit {
  const u = data.units.find((x) => x.id === id);
  if (!u) throw new Error(`fixture missing ${id}`);
  return u;
}

function messages(data: unknown): string[] {
  const result = geologicTimeSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('geologic-time data', () => {
  it('passes the schema', () => {
    expect(messages(rawGeologicTime)).toEqual([]);
  });

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

  it('looks units up by id', () => {
    expect(unitById('mesozoic').rank).toBe('era');
    expect(() => unitById('nope')).toThrow(/Unknown geologic unit/);
  });
});

describe('geologicTimeSchema', () => {
  it('rejects a gap between sibling periods', () => {
    const data = clone();
    unit(data, 'jurassic').baseMa = 200;
    expect(messages(data)).toContainEqual(expect.stringMatching(/Gap or overlap/));
  });

  it('rejects an overlap between sibling periods', () => {
    const data = clone();
    unit(data, 'jurassic').baseMa = 205;
    expect(messages(data)).toContainEqual(expect.stringMatching(/Gap or overlap/));
  });

  it('rejects a unit whose base is younger than its top', () => {
    const data = clone();
    unit(data, 'triassic').topMa = 260;
    expect(messages(data)).toContainEqual(expect.stringMatching(/must be greater than topMa/));
  });

  it('rejects an unknown parent', () => {
    const data = clone();
    data.units.push({ ...unit(data, 'jurassic'), id: 'orphan', parent: 'paleozoic' });
    expect(messages(data)).toContainEqual(expect.stringMatching(/unknown parent "paleozoic"/));
  });

  it('rejects a duplicate id', () => {
    const data = clone();
    data.units.push({ ...unit(data, 'jurassic') });
    expect(messages(data)).toContainEqual(expect.stringMatching(/Duplicate unit id "jurassic"/));
  });

  it('rejects a child outside its parent', () => {
    const data = clone();
    unit(data, 'cretaceous').topMa = 60;
    expect(messages(data)).toContainEqual(expect.stringMatching(/outside its parent/));
  });

  it('rejects a skipped rank (stage directly under an era)', () => {
    const data = clone();
    data.units.push({ ...unit(data, 'triassic'), id: 'induan', rank: 'stage' });
    expect(messages(data)).toContainEqual(expect.stringMatching(/cannot be a child of "mesozoic"/));
  });

  it('rejects unknown fields', () => {
    const data = { ...clone(), extra: true };
    expect(messages(data).length).toBeGreaterThan(0);
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

  it('rounds for headings', () => {
    expect(formatMaRounded(251.902)).toBe('252');
    expect(formatMaRounded(66)).toBe('66');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import en from '../../data/i18n/en/common.json';
import pl from '../../data/i18n/pl/common.json';
import { setLocale } from '@/lib/locale';
import { tr } from '@/lib/i18n';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

afterEach(() => {
  setLocale('en');
});

describe('Polish plural forms', () => {
  it.each([
    [1, 'Znaleziono 1 gatunek'],
    [2, 'Znaleziono 2 gatunki'],
    [4, 'Znaleziono 4 gatunki'],
    [5, 'Znaleziono 5 gatunków'],
    [12, 'Znaleziono 12 gatunków'],
    [22, 'Znaleziono 22 gatunki'],
    [103, 'Znaleziono 103 gatunki'],
    [112, 'Znaleziono 112 gatunków'],
  ])('%i', (n, expected) => {
    setLocale('pl');
    expect(tr('filters.found', { count: n })).toBe(expected);
  });

  it('every plural key in Polish has one, few, many and other', () => {
    const groups = new Map<string, Set<string>>();
    for (const k of keys(pl)) {
      const m = /^(.*)_(zero|one|two|few|many|other)$/.exec(k);
      if (m?.[1] && m[2]) groups.set(m[1], (groups.get(m[1]) ?? new Set()).add(m[2]));
    }
    for (const [key, forms] of groups) {
      expect([key, ['few', 'many', 'one', 'other'].filter((f) => !forms.has(f))]).toEqual([
        key,
        [],
      ]);
    }
  });
});

describe('translation parity', () => {
  it('Polish and English define the same keys (ignoring plural suffixes)', () => {
    const e = new Set(keys(en).map(base));
    const p = new Set(keys(pl).map(base));
    expect([...e].filter((k) => !p.has(k))).toEqual([]);
    expect([...p].filter((k) => !e.has(k))).toEqual([]);
  });
});

describe('marker accessible name', () => {
  it('names the diet in words, in both languages', () => {
    const args = { genus: 'Allosaurus', tag: '', diet: 'x', start: '155', end: '145' };
    setLocale('en');
    expect(tr('timeline.marker', { ...args, diet: tr('diet.carnivore').toLowerCase() })).toContain(
      tr('diet.carnivore').toLowerCase(),
    );
    setLocale('pl');
    const name = tr('timeline.marker', { ...args, diet: tr('diet.carnivore').toLowerCase() });
    expect(name).toContain(tr('diet.carnivore').toLowerCase());
    expect(name).toContain('mln lat temu');
  });
});

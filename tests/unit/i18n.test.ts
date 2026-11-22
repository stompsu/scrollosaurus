import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../data/i18n/en/common.json';
import pl from '../../data/i18n/pl/common.json';
import { unitById, unitName } from '@/lib/geologic-time';
import { i18nFor, isLangLoaded, loadLang, tr } from '@/lib/i18n';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

beforeAll(async () => {
  await loadLang('pl');
});

describe('loading languages', () => {
  it('has English from the start and Polish once loaded, as separate instances', async () => {
    expect(isLangLoaded('en')).toBe(true);
    const plInstance = await loadLang('pl');
    expect(isLangLoaded('pl')).toBe(true);
    expect(i18nFor('pl')).toBe(plInstance);
    expect(i18nFor('en')).not.toBe(plInstance);
  });

  it('formats each language independently, with no shared current language', () => {
    expect(tr('en', 'filters.found', { count: 5 })).toBe('5 species found');
    expect(tr('pl', 'filters.found', { count: 5 })).toBe('Znaleziono 5 gatunków');
    expect(tr('en', 'filters.found', { count: 5 })).toBe('5 species found');
    expect(unitName('pl', unitById('late-jurassic'))).toBe('Późna jura');
    expect(unitName('en', unitById('late-jurassic'))).toBe('Late Jurassic');
  });
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
    expect(tr('pl', 'filters.found', { count: n })).toBe(expected);
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
    const diet = (lang: 'en' | 'pl') => tr(lang, 'diet.carnivore').toLowerCase();
    expect(tr('en', 'timeline.marker', { ...args, diet: diet('en') })).toContain(diet('en'));
    const name = tr('pl', 'timeline.marker', { ...args, diet: diet('pl') });
    expect(name).toContain(diet('pl'));
    expect(name).toContain('mln lat temu');
  });
});

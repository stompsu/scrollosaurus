import { describe, expect, it } from 'vitest';
import { checkTranslations } from '@/lib/schemas/i18n-check';
import { formatNumber, langPath, localDecimal, localize, splitLangPath } from '@/lib/locale';

describe('language paths', () => {
  it.each([
    ['/', { lang: 'en', path: '/' }],
    ['/pl', { lang: 'pl', path: '/' }],
    ['/pl/', { lang: 'pl', path: '/' }],
    ['/pl/species/triceratops', { lang: 'pl', path: '/species/triceratops' }],
    // A genus that starts with "pl" is not the Polish prefix.
    ['/species/plateosaurus', { lang: 'en', path: '/species/plateosaurus' }],
    ['/plateosaurus', { lang: 'en', path: '/plateosaurus' }],
  ])('splitLangPath(%s)', (pathname, expected) => {
    expect(splitLangPath(pathname)).toEqual(expected);
  });

  it('builds paths in each language', () => {
    expect(langPath('/', 'en')).toBe('/');
    expect(langPath('/', 'pl')).toBe('/pl');
    expect(langPath('/about', 'pl')).toBe('/pl/about');
  });
});

describe('number formatting follows the language', () => {
  it('uses a decimal point in English and a comma in Polish, without grouping', () => {
    expect(formatNumber('en', 1.1)).toBe('1.1');
    expect(formatNumber('en', 12000)).toBe('12000');
    expect(formatNumber('pl', 1.1)).toBe('1,1');
    expect(formatNumber('pl', 12000)).toBe('12000');
    // Interleaved calls don't leak into each other: there is no shared current language.
    expect(formatNumber('en', 1.1)).toBe('1.1');
    expect(localDecimal('pl', '251.902')).toBe('251,902');
    expect(localDecimal('en', '251.902')).toBe('251.902');
  });

  it('picks the text for the language, falling back to English', () => {
    expect(localize('pl', { en: 'Jaw', pl: 'Szczęka' })).toBe('Szczęka');
    expect(localize('en', { en: 'Jaw', pl: 'Szczęka' })).toBe('Jaw');
    expect(localize('pl', { en: 'Jaw' })).toBe('Jaw');
  });
});

describe('checkTranslations', () => {
  const geo = { triassic: 'Trias' };
  it('accepts matching strings, with Polish-only plural forms', () => {
    expect(
      checkTranslations(
        { a: { found_one: '{{count}} species', found_other: '{{count}} species' } },
        {
          a: {
            found_one: '{{count}} gatunek',
            found_few: '{{count}} gatunki',
            found_many: '{{count}} gatunków',
            found_other: '{{count}} gatunku',
          },
        },
        geo,
        ['triassic'],
      ),
    ).toEqual([]);
  });

  it('reports missing keys, placeholder mismatches and missing unit names', () => {
    const errors = checkTranslations({ a: 'Hello {{name}}', b: 'x' }, { a: 'Cześć {{imie}}' }, {}, [
      'triassic',
    ]);
    expect(errors).toEqual([
      expect.stringMatching(/missing "b"/),
      expect.stringMatching(/"a" uses \{\{imie\}\}/),
      expect.stringMatching(/no Polish name for unit "triassic"/),
    ]);
  });
});

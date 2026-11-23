import { intlLocale, type Lang } from './locale';
import type { Diet } from './schemas/species';

/**
 * Formatting helpers for data values in a given language. UI words (diet names, continents,
 * image kinds…) are translation keys in data/i18n/{en,pl}/common.json, read with `t()`.
 */

/** Diets whose label has a short explanation, e.g. "Piscivore (fish-eater)". */
export const DIETS_WITH_HINT: ReadonlySet<Diet> = new Set([
  'carnivore',
  'herbivore',
  'omnivore',
  'piscivore',
  'insectivore',
]);

const regionNames = new Map<string, Intl.DisplayNames | undefined>();

/** Country name from an ISO 3166-1 alpha-2 code in `lang`: "CN" → "China" / "Chiny". */
export function countryName(lang: Lang, code: string): string {
  const locale = intlLocale(lang);
  if (!regionNames.has(locale)) {
    regionNames.set(
      locale,
      typeof Intl.DisplayNames === 'function'
        ? new Intl.DisplayNames([locale], { type: 'region' })
        : undefined,
    );
  }
  return regionNames.get(locale)?.of(code) ?? code;
}

/** "1.1 m", "4.8–10 m" ("1,1 m" in Polish): a [min, max] range with a unit. */
export function formatRange(lang: Lang, value: readonly [number, number], unit: string): string {
  const fmt = (n: number) => n.toLocaleString(intlLocale(lang), { maximumFractionDigits: 2 });
  const [lo, hi] = value;
  return lo === hi ? `${fmt(lo)} ${unit}` : `${fmt(lo)}–${fmt(hi)} ${unit}`;
}

/** Mass in kg or tonnes: [450, 450] → "450 kg", [4000, 15000] → "4–15 t". */
export function formatMass(lang: Lang, value: readonly [number, number]): string {
  return value[1] >= 1000
    ? formatRange(lang, [value[0] / 1000, value[1] / 1000], 't')
    : formatRange(lang, value, 'kg');
}

/**
 * The site's languages and the formatting locale. The language comes from the URL: `/pl/...` is
 * Polish, everything else English (ADR-0001 §9). Formatting helpers read the current language
 * from here, so numbers follow it ("1.1 m" / "1,1 m") without threading it through every call;
 * the language layout sets it before its page renders.
 */
export const LANGS = ['en', 'pl'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

const INTL_LOCALE: Record<Lang, string> = { en: 'en-GB', pl: 'pl-PL' };

let current: Lang = DEFAULT_LANG;

export function setLocale(lang: Lang): void {
  current = lang;
}

export function getLocale(): Lang {
  return current;
}

export function intlLocale(lang: Lang = current): string {
  return INTL_LOCALE[lang];
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** A number in the current language, at most `maxFractionDigits` decimals, no grouping. */
export function formatNumber(n: number, maxFractionDigits = 1): string {
  const key = `${current}:${String(maxFractionDigits)}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[current], {
      maximumFractionDigits: maxFractionDigits,
      useGrouping: false,
    });
    numberFormats.set(key, f);
  }
  return f.format(n);
}

/** Uses the current language's decimal separator in an already formatted number string. */
export function localDecimal(s: string): string {
  return current === 'pl' ? s.replace('.', ',') : s;
}

/** Text in the given language, falling back to English (the validator requires Polish). */
export function localize(
  text: { en: string; pl?: string | undefined },
  lang: Lang = current,
): string {
  return (lang === 'pl' ? text.pl : undefined) ?? text.en;
}

/** "/species/x" in a language: "/species/x" or "/pl/species/x". */
export function langPath(path: string, lang: Lang): string {
  if (lang === DEFAULT_LANG) return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

/** Splits a router pathname into its language and the path without the language prefix. */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  const m = /^\/(pl)(\/.*)?$/.exec(pathname);
  return m ? { lang: 'pl', path: m[2] ?? '/' } : { lang: DEFAULT_LANG, path: pathname };
}

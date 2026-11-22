/**
 * The site's languages and number formatting. The language comes from the URL: `/pl/...` is
 * Polish, everything else English (ADR-0001 §9). Components read it from `LangContext`
 * (`useLang()` in ./lang) and pass it to every formatting helper, so text rendered in one commit
 * can never mix languages; there is no module-level "current language".
 */
export const LANGS = ['en', 'pl'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

const INTL_LOCALE: Record<Lang, string> = { en: 'en-GB', pl: 'pl-PL' };

export function intlLocale(lang: Lang): string {
  return INTL_LOCALE[lang];
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** A number in `lang`, at most `maxFractionDigits` decimals, no grouping. */
export function formatNumber(lang: Lang, n: number, maxFractionDigits = 1): string {
  const key = `${lang}:${String(maxFractionDigits)}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[lang], {
      maximumFractionDigits: maxFractionDigits,
      useGrouping: false,
    });
    numberFormats.set(key, f);
  }
  return f.format(n);
}

/** Uses `lang`'s decimal separator in an already formatted number string. */
export function localDecimal(lang: Lang, s: string): string {
  return lang === 'pl' ? s.replace('.', ',') : s;
}

/** Text in `lang`, falling back to English (the validator requires Polish). */
export function localize(lang: Lang, text: { en: string; pl?: string | undefined }): string {
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

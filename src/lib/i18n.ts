import i18next, { type i18n, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../data/i18n/en/common.json';
import { DEFAULT_LANG, LANGS, type Lang } from './locale';

/**
 * One i18next instance per language. English ships in the entry chunk; Polish is a separate chunk
 * loaded by {@link loadLang} (the /pl/ pages preload it). The language layout waits for its
 * language before rendering, so a page never shows strings from the wrong language. Nothing is
 * detected from the browser (owner decision, Phase 6).
 */
const instances = new Map<Lang, i18n>();
const pending = new Map<Lang, Promise<i18n>>();

function createInstance(lang: Lang, resources: Resource): i18n {
  const inst = i18next.createInstance();
  void inst.use(initReactI18next).init({
    lng: lang,
    fallbackLng: DEFAULT_LANG,
    supportedLngs: [...LANGS],
    resources,
    defaultNS: 'common',
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return inst;
}

instances.set('en', createInstance('en', { en: { common: en } }));

/** Whether `lang`'s strings are loaded, so {@link i18nFor} and {@link tr} can use it. */
export function isLangLoaded(lang: Lang): boolean {
  return instances.has(lang);
}

/**
 * Loads `lang`'s strings (once; later calls return the same promise). English is always loaded.
 * A failed load stays failed for this page load: the layout's `use()` must see the same rejected
 * promise to reach its error page (a fresh promise per render would refetch forever). The error
 * page's retry reloads the page.
 */
export function loadLang(lang: Lang): Promise<i18n> {
  const ready = instances.get(lang);
  if (ready) return Promise.resolve(ready);
  if (lang !== 'pl') return Promise.reject(new Error(`No strings for "${lang}"`));
  let promise = pending.get(lang);
  if (!promise) {
    promise = import('./i18n-pl').then(({ common, geology }) => {
      const inst = createInstance(lang, { en: { common: en }, pl: { common, geology } });
      instances.set(lang, inst);
      pending.delete(lang);
      return inst;
    });
    // Handled by whoever awaits it (the layout's error page); don't report it as unhandled here.
    promise.catch(() => undefined);
    pending.set(lang, promise);
  }
  return promise;
}

/** The i18next instance for `lang`. Its strings must be loaded ({@link loadLang}). */
export function i18nFor(lang: Lang): i18n {
  const inst = instances.get(lang);
  if (!inst)
    throw new Error(`Strings for "${lang}" are not loaded: await loadLang("${lang}") first`);
  return inst;
}

/**
 * Translates in `lang`, for code outside React components (label and layout helpers).
 * Components use `useTranslation()`, whose instance the language layout provides.
 */
export function tr(lang: Lang, key: string, options?: Record<string, unknown>): string {
  return i18nFor(lang).t(key, options ?? {});
}

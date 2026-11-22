import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../data/i18n/en/common.json';
import pl from '../../data/i18n/pl/common.json';
import { getLocale, LANGS, type Lang } from './locale';

/**
 * One i18next instance per language, created once with both resource sets bundled (they are
 * small). The language layout picks the instance for its route; nothing is detected from the
 * browser (owner decision, Phase 6).
 */
const instances = new Map<Lang, i18n>();

export function i18nFor(lang: Lang): i18n {
  let inst = instances.get(lang);
  if (!inst) {
    inst = i18next.createInstance();
    void inst.use(initReactI18next).init({
      lng: lang,
      fallbackLng: 'en',
      supportedLngs: [...LANGS],
      resources: { en: { common: en }, pl: { common: pl } },
      defaultNS: 'common',
      initAsync: false,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    instances.set(lang, inst);
  }
  return inst;
}

/**
 * Translates in the current formatting language, for code outside React components (labels,
 * module helpers). Components use `useTranslation()`; both read the same resources.
 */
export function tr(key: string, options?: Record<string, unknown>): string {
  const inst = i18nFor(getLocale());
  return inst.t(key, options ?? {});
}

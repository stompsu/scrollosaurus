import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_LANG, langPath, localize, type Lang } from './locale';

/** The language of the route being rendered, provided by the language layout. */
export const LangContext = createContext<Lang>(DEFAULT_LANG);

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Maps an app path ("/species/x?q") to the current language's URL ("/pl/species/x?q"). */
export function useLangPath(): (path: string) => string {
  const lang = useLang();
  return useCallback((path: string) => langPath(path, lang), [lang]);
}

/** Picks the current language from a `{ en, pl }` text. */
export function useLocalize(): (text: { en: string; pl?: string | undefined }) => string {
  const lang = useLang();
  return useCallback((text) => localize(text, lang), [lang]);
}

/** localStorage key for an explicit language choice made with the switch. */
export const LANG_STORAGE_KEY = 'scrollosaurus:lang';

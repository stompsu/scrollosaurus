import { use, useEffect, useRef, ViewTransition } from 'react';
import type { i18n } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UpdateNotice } from '@/components/ui/UpdateNotice';
import { geologicTime } from '@/lib/geologic-time';
import { i18nFor, isLangLoaded, loadLang, tr } from '@/lib/i18n';
import { LANG_STORAGE_KEY, LangContext, useLang } from '@/lib/lang';
import { langPath, splitLangPath, type Lang } from '@/lib/locale';
import { applyUpdate } from '@/lib/pwa';

const navClassFor = (active: boolean) =>
  `inline-block py-2 ${active ? 'text-accent underline underline-offset-4' : 'hover:text-accent'}`;
const navClass = ({ isActive }: { isActive: boolean }) => navClassFor(isActive);

/** The timeline and its species drawer are one page; opening the drawer isn't a page change. */
function pageOf(pathname: string): string {
  const { path } = splitLangPath(pathname);
  return path === '/' || path.startsWith('/species/') ? '/' : path;
}

/** Moves focus to <main> after client-side navigation so keyboard and screen-reader users land on the new page. */
function useFocusMainOnNavigate() {
  const mainRef = useRef<HTMLElement>(null);
  const page = pageOf(useLocation().pathname);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [page]);
  return mainRef;
}

function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return v === 'pl' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

/** A link to this page in the other language, keeping the query; remembers the choice. */
function LanguageSwitch() {
  const lang = useLang();
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const other: Lang = lang === 'pl' ? 'en' : 'pl';
  const { path } = splitLangPath(pathname);
  const to = `${langPath(path, other)}${search}`;
  // Start fetching the other language's strings as soon as the switch is pointed at or focused.
  // The navigation itself is a transition, so this page stays up until they have arrived.
  const prefetch = () => {
    void loadLang(other).catch(() => undefined);
  };
  return (
    <Link
      to={to}
      lang={other}
      hrefLang={other}
      className="sc-lang-switch"
      data-testid="language-switch"
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onClick={() => {
        try {
          localStorage.setItem(LANG_STORAGE_KEY, other);
        } catch {
          // Storage blocked: the switch still works for this visit.
        }
      }}
    >
      {t('site.inOtherLanguage')}
      <span className="sr-only">: {t('site.inOtherLanguageLabel')}</span>
    </Link>
  );
}

function Shell() {
  const lang = useLang();
  const { t } = useTranslation();
  const { chart } = geologicTime;
  const mainRef = useFocusMainOnNavigate();
  const page = pageOf(useLocation().pathname);
  const onTimeline = page === '/';
  const to = (path: string) => langPath(path, lang);
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6">
      <a
        href="#main"
        className="bg-bg text-accent border-accent sr-only rounded border-2 px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t('site.skip')}
      </a>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <Link to={to('/')} className="font-display py-1 text-3xl">
          {t('site.name')}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <nav aria-label={t('site.nav')}>
            <ul className="flex gap-4 text-sm">
              <li>
                {/* A plain Link: NavLink drops aria-current when "/" isn't an exact match. */}
                <Link
                  to={to('/')}
                  className={navClassFor(onTimeline)}
                  aria-current={onTimeline ? 'page' : undefined}
                >
                  {t('site.timeline')}
                </Link>
              </li>
              <li>
                <NavLink to={to('/about')} className={navClass}>
                  {t('site.about')}
                </NavLink>
              </li>
              <li>
                <NavLink to={to('/credits')} className={navClass}>
                  {t('site.credits')}
                </NavLink>
              </li>
            </ul>
          </nav>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Page changes cross-fade; updates within a page (the species drawer) don't. */}
        <ViewTransition key={page} update="none">
          <Outlet />
        </ViewTransition>
      </main>
      <footer className="text-text-muted text-xs">
        {t('site.footer', {
          chart: chart.name,
          version: chart.version,
          publisher: chart.publisher,
          license: chart.license,
        })}
      </footer>
      <UpdateNotice />
    </div>
  );
}

/**
 * Whether this visit has already looked at the stored language choice. Module-level, not per
 * layout: the English and Polish layouts are separate route elements, so Back from /pl/ to / mounts
 * a new English layout, which must not send the reader straight back to /pl/.
 */
let storedChoiceChecked = false;

/**
 * Shown when a language layout fails to render, most likely because its strings chunk didn't
 * download (a flaky connection, or a tab left open across a deploy that renamed the chunk). Written
 * in the route's language when its strings are loaded, else in English.
 */
export function LayoutError({ lang = 'en' }: { lang?: Lang }) {
  const shown: Lang = isLangLoaded(lang) ? lang : 'en';
  const t = (key: string) => tr(shown, key);
  const { path } = splitLangPath(useLocation().pathname);
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-4 py-6" lang={shown}>
      <title>{t('loadError.title')}</title>
      <h1 className="font-display text-3xl">{t('loadError.title')}</h1>
      <p>{t('loadError.text')}</p>
      <p className="flex flex-wrap gap-4">
        <button
          type="button"
          className="sc-button sc-button--primary"
          onClick={() => {
            // A tab left open across a deploy: switch to the new version if it has downloaded.
            if (!applyUpdate()) window.location.reload();
          }}
        >
          {t('loadError.retry')}
        </button>
        {lang !== 'en' && (
          <a className="text-accent underline" href={`${import.meta.env.BASE_URL}${path.slice(1)}`}>
            {t('loadError.english')}
          </a>
        )}
      </p>
    </main>
  );
}

/**
 * The i18next instance for `lang`, suspending until its strings have loaded (Polish is a separate
 * chunk, preloaded by the /pl/ pages). Inside a navigation the router renders in a transition, so
 * the previous page stays up meanwhile instead of showing strings in the wrong language.
 */
function useLangStrings(lang: Lang): i18n {
  return isLangLoaded(lang) ? i18nFor(lang) : use(loadLang(lang));
}

/**
 * The site layout for one language: `/…` is English and `/pl/…` Polish (ADR-0001 §9). It provides
 * the language and its strings to the pages below, sets the document's `lang`, and on
 * a bare visit to the English home page follows a Polish choice remembered from the switch.
 */
export function Layout({ lang = 'en' }: { lang?: Lang }) {
  const strings = useLangStrings(lang);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (storedChoiceChecked) return;
    storedChoiceChecked = true;
    // Only a bare visit to the home page follows the stored choice: any other English address
    // (a shared link, a bookmark) opens in the language it was copied in (ADR-0001 §9).
    if (lang === 'en' && pathname === '/' && search === '' && readStoredLang() === 'pl') {
      void loadLang('pl').catch(() => undefined);
      void navigate(langPath('/', 'pl'), { replace: true });
    }
    // Once per visit, on the first page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LangContext value={lang}>
      <I18nextProvider i18n={strings}>
        <Shell />
      </I18nextProvider>
    </LangContext>
  );
}

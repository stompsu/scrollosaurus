import { useEffect, useRef, ViewTransition } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { geologicTime } from '@/lib/geologic-time';
import { i18nFor } from '@/lib/i18n';
import { LANG_STORAGE_KEY, LangContext, useLang } from '@/lib/lang';
import { langPath, setLocale, splitLangPath, type Lang } from '@/lib/locale';

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
  return (
    <Link
      to={`${langPath(path, other)}${search}`}
      lang={other}
      hrefLang={other}
      className="sc-lang-switch"
      data-testid="language-switch"
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
    </div>
  );
}

/**
 * The site layout for one language: `/…` is English and `/pl/…` Polish (ADR-0001 §9). It provides
 * the language to the pages below, sets the formatting locale and the document's `lang`, and on
 * the first English page of a visit follows a Polish choice remembered from the switch.
 */
export function Layout({ lang = 'en' }: { lang?: Lang }) {
  // Set before the pages render, so number formatting below uses this language.
  setLocale(lang);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const checkedStored = useRef(false);
  useEffect(() => {
    if (checkedStored.current) return;
    checkedStored.current = true;
    if (lang === 'en' && readStoredLang() === 'pl') {
      void navigate(`${langPath(splitLangPath(pathname).path, 'pl')}${search}`, { replace: true });
    }
    // Once per visit, on the first page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LangContext value={lang}>
      <I18nextProvider i18n={i18nFor(lang)}>
        <Shell />
      </I18nextProvider>
    </LangContext>
  );
}

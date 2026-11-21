import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { geologicTime } from '@/lib/geologic-time';

const navClassFor = (active: boolean) =>
  `inline-block py-2 ${active ? 'text-accent underline underline-offset-4' : 'hover:text-accent'}`;
const navClass = ({ isActive }: { isActive: boolean }) => navClassFor(isActive);

/** The timeline and its species drawer are one page; opening the drawer isn't a page change. */
function pageOf(pathname: string): string {
  return pathname === '/' || pathname.startsWith('/species/') ? '/' : pathname;
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

export function Layout() {
  const { chart } = geologicTime;
  const mainRef = useFocusMainOnNavigate();
  const onTimeline = pageOf(useLocation().pathname) === '/';
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6">
      <a
        href="#main"
        className="bg-bg text-accent border-accent sr-only rounded border-2 px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <Link to="/" className="font-display py-1 text-3xl">
          Scrollosaurus
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-4 text-sm">
            <li>
              <NavLink
                to="/"
                className={navClassFor(onTimeline)}
                aria-current={onTimeline ? 'page' : undefined}
              >
                Timeline
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={navClass}>
                About
              </NavLink>
            </li>
            <li>
              <NavLink to="/credits" className={navClass}>
                Credits
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <footer className="text-text-muted text-xs">
        Geological time: {chart.name} {chart.version}, {chart.publisher} ({chart.license}).
      </footer>
    </div>
  );
}

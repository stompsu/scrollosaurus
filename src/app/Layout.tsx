import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { geologicTime } from '@/lib/geologic-time';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-block py-2 ${isActive ? 'text-accent underline underline-offset-4' : 'hover:text-accent'}`;

/** Moves focus to <main> after client-side navigation so keyboard and screen-reader users land on the new page. */
function useFocusMainOnNavigate() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);
  return mainRef;
}

export function Layout() {
  const { chart } = geologicTime;
  const mainRef = useFocusMainOnNavigate();
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
              <NavLink to="/" end className={navClass}>
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

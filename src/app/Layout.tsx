import { NavLink, Outlet } from 'react-router';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-accent underline underline-offset-4' : 'hover:text-accent';

export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6">
      <a
        href="#main"
        className="bg-surface sr-only rounded px-3 py-2 focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <NavLink to="/" className="font-display text-3xl">
          Scrollosaurus
        </NavLink>
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
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="text-text-muted text-xs">
        Geological time: International Chronostratigraphic Chart, ICS (CC BY 4.0).
      </footer>
    </div>
  );
}

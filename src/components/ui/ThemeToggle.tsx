import { useState } from 'react';

const KEY = 'scrollosaurus:theme';
type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * Light/dark switch. Dark "deep time" is the default; the choice is kept in localStorage (a UI
 * preference, allowed by the project's privacy rules) and applied before paint by theme-init.js.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const light = theme === 'light';
  const toggle = () => {
    const next: Theme = light ? 'dark' : 'light';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'light' ? '#f4efe4' : '#12100e');
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
    setTheme(next);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      className="sc-theme-toggle"
      onClick={toggle}
      data-testid="theme-toggle"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        {light ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </g>
        ) : (
          <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor" />
        )}
      </svg>
      Light mode
    </button>
  );
}

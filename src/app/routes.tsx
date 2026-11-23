import type { RouteObject } from 'react-router';
import { Layout, LayoutError } from './Layout';
import AboutPage from './routes/AboutPage';
import CreditsPage from './routes/CreditsPage';
import NotFoundPage from './routes/NotFoundPage';
import TimelinePage from './routes/TimelinePage';

/** The pages of one language; the same tree is mounted at `/` (English) and `/pl` (Polish). */
function pages(): RouteObject[] {
  return [
    {
      // One page for both paths, so the timeline stays mounted when the drawer opens or closes.
      element: <TimelinePage />,
      children: [{ index: true }, { path: 'species/:slug' }],
    },
    { path: 'about', element: <AboutPage /> },
    { path: 'credits', element: <CreditsPage /> },
    { path: '*', element: <NotFoundPage /> },
  ];
}

/**
 * Static routes. scripts/emit-route-html.ts writes an index.html for each path in STATIC_PATHS
 * and for every species page, in both languages.
 */
export const routes: RouteObject[] = [
  {
    path: 'pl',
    element: <Layout lang="pl" />,
    errorElement: <LayoutError lang="pl" />,
    children: pages(),
  },
  { element: <Layout lang="en" />, errorElement: <LayoutError lang="en" />, children: pages() },
];

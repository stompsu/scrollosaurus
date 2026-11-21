import type { RouteObject } from 'react-router';
import { Layout } from './Layout';
import AboutPage from './routes/AboutPage';
import CreditsPage from './routes/CreditsPage';
import NotFoundPage from './routes/NotFoundPage';
import TimelinePage from './routes/TimelinePage';

/**
 * Static routes. scripts/emit-route-html.ts writes an index.html for each path in STATIC_PATHS
 * and for every species page.
 */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      {
        // One page for both paths, so the timeline stays mounted when the drawer opens or closes.
        element: <TimelinePage />,
        children: [{ index: true }, { path: 'species/:slug' }],
      },
      { path: 'about', element: <AboutPage /> },
      { path: 'credits', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

import type { RouteObject } from 'react-router';
import { Layout } from './Layout';
import AboutPage from './routes/AboutPage';
import CreditsPage from './routes/CreditsPage';
import HomePage from './routes/HomePage';
import NotFoundPage from './routes/NotFoundPage';

/** Static routes. scripts/emit-route-html.ts writes an index.html for each path in STATIC_PATHS. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'credits', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

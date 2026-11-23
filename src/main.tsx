import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './app/routes';
import { startServiceWorker } from './lib/pwa';
import './styles/index.css';

// The basename keeps its trailing slash, so the home page is /scrollosaurus/ (what GitHub Pages
// serves) rather than /scrollosaurus, which is outside the service worker's scope (ADR-0003).
const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    {/* Shown only on a first visit while a language's strings load (nothing, not English). */}
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);

startServiceWorker();

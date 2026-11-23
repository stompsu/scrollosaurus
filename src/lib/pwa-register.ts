/**
 * Registers dist/sw.js for the whole site and reports a new version once it is installed and
 * waiting. Loaded on demand by `startServiceWorker()` (src/lib/pwa.ts).
 */
import type { SwMessage } from '@/sw/strategy';
import { setWaitingWorker } from './pwa';

export async function registerServiceWorker(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });

  const track = (worker: ServiceWorker | null) => {
    if (!worker) return;
    const check = () => {
      // "installed" with a controller present means an update is waiting. On the first visit
      // there is no controller: the new worker simply takes over, nothing to announce.
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        setWaitingWorker(worker);
      } else if (worker.state === 'redundant') {
        setWaitingWorker(null);
      }
    };
    check();
    worker.addEventListener('statechange', check);
  };

  // On the first visit the page loads before any worker controls it, so its species data and
  // images bypass the worker. Once the worker takes control (every later request goes through it),
  // hand it the URLs the page has already loaded; it keeps only those it would have cached anyway.
  if (!navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        const urls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(`${location.origin}${base}`));
        navigator.serviceWorker.controller?.postMessage({
          type: 'CACHE_URLS',
          urls,
        } satisfies SwMessage);
      },
      { once: true },
    );
  }

  track(registration.waiting);
  registration.addEventListener('updatefound', () => {
    track(registration.installing);
  });
}

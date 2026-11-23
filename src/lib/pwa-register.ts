/**
 * Registers dist/sw.js for the whole site and reports new versions to the notice state in
 * `pwa.ts`. Loaded on demand by `startServiceWorker()`.
 */
import type { SwMessage } from '@/sw/strategy';
import { clearWaitingWorker, markTakenOver, setWaitingWorker } from './pwa';

/** Follows one worker: reports it once it is installed and waiting behind the current version. */
export function trackWorker(worker: ServiceWorker | null, container: ServiceWorkerContainer): void {
  if (!worker) return;
  const check = () => {
    // "installed" with a controller present means an update is waiting. On the first visit
    // there is no controller: the new worker simply takes over, nothing to announce.
    if (worker.state === 'installed' && container.controller) setWaitingWorker(worker);
    else if (worker.state === 'redundant') clearWaitingWorker(worker);
  };
  check();
  worker.addEventListener('statechange', check);
}

/** Same-origin URLs this page has loaded so far, under the site's base path. */
function loadedUrls(base: string): string[] {
  return performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(`${location.origin}${base}`));
}

/**
 * Reacts to a new worker taking control of this page:
 * - On the first visit (no worker yet), the page loaded before any worker controlled it, so its
 *   species data and images bypassed the cache. Every later request goes through the worker, so
 *   hand it the URLs loaded so far; it keeps only those it would have cached anyway.
 * - Otherwise a new version took over from another tab (its Reload button) and removed this
 *   page's old files: the page has to reload.
 */
export function watchController(container: ServiceWorkerContainer, base: string): void {
  let firstWorker = container.controller === null;
  container.addEventListener('controllerchange', () => {
    if (firstWorker) {
      firstWorker = false;
      container.controller?.postMessage({
        type: 'CACHE_URLS',
        urls: loadedUrls(base),
      } satisfies SwMessage);
    } else {
      markTakenOver();
    }
  });
}

export async function registerServiceWorker(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const container = navigator.serviceWorker;
  watchController(container, base);
  const registration = await container.register(`${base}sw.js`, { scope: base });
  // A new version may have started installing while the page loaded, before this ran.
  trackWorker(registration.waiting, container);
  trackWorker(registration.installing, container);
  registration.addEventListener('updatefound', () => {
    trackWorker(registration.installing, container);
  });
}

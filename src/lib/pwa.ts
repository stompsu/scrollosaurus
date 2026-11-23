/**
 * The page's side of the service worker (ADR-0003): starts registration after the page has
 * loaded, and tracks a new version that is installed and waiting, so the layout can offer to switch
 * to it. Registration itself lives in a lazily loaded chunk (`pwa-register.ts`) to keep the entry
 * small. Production builds only: the dev server never registers a worker.
 */
import { useSyncExternalStore } from 'react';
import type { SwMessage } from '@/sw/strategy';

let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();

/** Called by the registration code when a new version is waiting (or no longer is). */
export function setWaitingWorker(worker: ServiceWorker | null): void {
  if (worker === waiting) return;
  waiting = worker;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a new version of the site is installed and ready to take over. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => waiting !== null,
    () => false,
  );
}

/**
 * Switches to the waiting version and reloads once it is in control. Returns false when no
 * version is waiting (the caller can then reload normally).
 */
export function applyUpdate(): boolean {
  const worker = waiting;
  if (!worker) return false;
  if (worker.state !== 'installed') {
    // Another tab has already switched: this page only needs to reload.
    window.location.reload();
    return true;
  }
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      window.location.reload();
    },
    { once: true },
  );
  worker.postMessage({ type: 'SKIP_WAITING' } satisfies SwMessage);
  return true;
}

/** Registers the service worker once the page has loaded, so it never competes with first paint. */
export function startServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const register = () => {
    import('./pwa-register')
      .then(({ registerServiceWorker }) => registerServiceWorker())
      .catch(() => {
        // Offline support is an extra: the site works the same without it.
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/**
 * The page's side of the service worker (ADR-0003): starts registration after the page has
 * loaded, and keeps the state the "new version" notice shows. Registration itself lives in a
 * lazily loaded chunk (`pwa-register.ts`) to keep the entry small. Production builds only: the dev
 * server never registers a worker.
 */
import { useSyncExternalStore } from 'react';
import type { SwMessage } from '@/sw/strategy';

/**
 * - `none`: nothing to show.
 * - `waiting`: a new version has downloaded and waits for this page to switch.
 * - `taken-over`: another tab switched to a new version, which removed this page's old files; this
 *   page has to reload (it can't be put off).
 */
export type UpdateState = 'none' | 'waiting' | 'taken-over';

let waiting: ServiceWorker | null = null;
/** The waiting version the reader chose "Later" for; a newer one is offered again. */
let dismissed: ServiceWorker | null = null;
let takenOver = false;
/** Set while this page itself is switching, so its own switch isn't reported as a takeover. */
let switching = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Called by the registration code when a new version is installed and waiting. */
export function setWaitingWorker(worker: ServiceWorker): void {
  if (worker === waiting) return;
  waiting = worker;
  notify();
}

/** Called when `worker` is no longer waiting (it became redundant); ignores other workers. */
export function clearWaitingWorker(worker: ServiceWorker): void {
  if (worker !== waiting) return;
  waiting = null;
  notify();
}

/** Called when a new version took control of this page without this page asking for it. */
export function markTakenOver(): void {
  if (switching || takenOver) return;
  takenOver = true;
  notify();
}

/** Hides the notice for the version that is waiting now ("Later"). */
export function dismissUpdate(): void {
  dismissed = waiting;
  notify();
}

function snapshot(): UpdateState {
  if (takenOver) return 'taken-over';
  return waiting && waiting !== dismissed ? 'waiting' : 'none';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What the "new version" notice should show. */
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, snapshot, () => 'none');
}

/** Test helper: forgets all state. */
export function resetUpdateState(): void {
  waiting = null;
  dismissed = null;
  takenOver = false;
  switching = false;
  notify();
}

/**
 * Switches to the new version and reloads once it is in control. Returns false when there is
 * nothing to switch to (the caller can then reload normally).
 */
export function applyUpdate(): boolean {
  if (takenOver) {
    window.location.reload();
    return true;
  }
  const worker = waiting;
  if (!worker) return false;
  if (worker.state !== 'installed') {
    // It has already started taking over (from another tab): this page only needs to reload.
    window.location.reload();
    return true;
  }
  switching = true;
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
  // The first visit hands the worker every species chunk and image it loaded (pwa-register.ts);
  // the default buffer of 250 entries can fill up on the timeline before that.
  performance.setResourceTimingBufferSize(1000);
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

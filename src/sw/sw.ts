/**
 * Scrollosaurus service worker (ADR-0003). Built to dist/sw.js by scripts/vite-pwa.ts, which
 * replaces __SC_BUILD__ with this build's file lists. It only caches the site's own public files:
 * no push, no background sync, no requests to other hosts.
 *
 * - Install: caches the entry script, styles, fonts, Polish strings, icons and both page shells.
 * - Pages: network first; offline, the cached shell in the page's language (every route renders
 *   from the same two shells).
 * - Species data chunks and images: cache first, saved when first used; images capped.
 * - A new version waits until the page asks it to take over (the "new version" notice), so an open
 *   tab never mixes files from two builds.
 */
import {
  IMAGE_CACHE,
  MAX_IMAGES,
  overflow,
  precacheName,
  routeFor,
  shellFor,
  SPECIES_CACHE,
  parseMessage,
  staleCaches,
  type SwBuild,
} from './strategy';

declare const __SC_BUILD__: SwBuild;
const build = __SC_BUILD__;
const sw = self as unknown as ServiceWorkerGlobalScope;
const PRECACHE = precacheName(build.version);

/**
 * Hashed files under assets/ never change, so the copy the page just downloaded can be reused.
 * Unhashed ones (page shells, manifests, icons) are revalidated, so an older copy from the HTTP
 * cache can't end up in a newer precache.
 */
function toInstallRequest(path: string): Request {
  return new Request(path, {
    cache: path.startsWith(`${build.base}assets/`) ? 'default' : 'no-cache',
  });
}

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(build.precache.map(toInstallRequest))),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        staleCaches(await caches.keys(), build.version).map((n) => caches.delete(n)),
      );
      // Species chunks are hashed: drop the ones this build no longer has.
      const species = await caches.open(SPECIES_CACHE);
      const current = new Set(build.speciesChunks);
      for (const req of await species.keys()) {
        if (!current.has(new URL(req.url).pathname)) await species.delete(req);
      }
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('message', (event) => {
  const message = parseMessage(event.data);
  if (message?.type === 'SKIP_WAITING') void sw.skipWaiting();
  if (message?.type === 'CACHE_URLS') event.waitUntil(cacheVisited(message.urls));
});

/**
 * Saves species chunks and images the page loaded before this worker was in control (on the
 * first visit it registers only after the page has loaded). Anything else in the list is ignored,
 * and the files usually come straight from the HTTP cache.
 */
async function cacheVisited(urls: readonly string[]): Promise<void> {
  for (const url of urls) {
    const route = routeFor({ method: 'GET', mode: 'cors', url }, sw.location.origin, build);
    try {
      if (route === 'species') await cacheFirst(new Request(url), SPECIES_CACHE);
      if (route === 'image') await cacheFirst(new Request(url), IMAGE_CACHE, MAX_IMAGES);
    } catch {
      // Gone or offline: it will be cached the next time it is used.
    }
  }
}

async function fromNetworkOrShell(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    const shell = await caches.match(shellFor(new URL(request.url).pathname, build.base), {
      cacheName: PRECACHE,
    });
    if (shell) return shell;
    throw error;
  }
}

async function cacheFirst(request: Request, cacheName: string, max?: number): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // Only whole, successful same-origin responses: never cache an error page.
  if (response.ok && response.type === 'basic' && response.status === 200) {
    await cache.put(request, response.clone());
    if (max !== undefined) {
      for (const old of overflow(await cache.keys(), max)) await cache.delete(old);
    }
  }
  return response;
}

async function fromPrecache(request: Request): Promise<Response> {
  return (await caches.match(request, { cacheName: PRECACHE })) ?? fetch(request);
}

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const route = routeFor(request, sw.location.origin, build);
  switch (route) {
    case 'navigate':
      event.respondWith(fromNetworkOrShell(request));
      break;
    case 'precache':
      event.respondWith(fromPrecache(request));
      break;
    case 'species':
      event.respondWith(cacheFirst(request, SPECIES_CACHE));
      break;
    case 'image':
      event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES));
      break;
    case null:
      break;
  }
});

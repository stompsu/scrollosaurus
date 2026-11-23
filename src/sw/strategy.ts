/**
 * The service worker's decisions, as pure functions so they can be unit-tested without a worker
 * (ADR-0003). Uses only types that exist in both the DOM and WebWorker libraries.
 */

/** What the build tells the service worker, injected into sw.js by scripts/vite-pwa.ts. */
export interface SwBuild {
  /** Changes whenever any built file changes; names the precache. */
  version: string;
  /** The site's base path, e.g. "/scrollosaurus/". */
  base: string;
  /** Absolute paths fetched and cached at install, including both page shells. */
  precache: string[];
  /** Absolute paths of the per-species data chunks (cached when first opened). */
  speciesChunks: string[];
  /**
   * Changes whenever any file under images/ changes. Image names don't change when Commons gets a
   * new revision of a file, so a new value drops every cached image (and its possibly outdated
   * credit match) at once.
   */
  imagesVersion: string;
}

/**
 * Cache names. The precache is per build and images per image set; species chunks outlive a build
 * (their names are content hashes) and are pruned to the current build's list on update.
 */
export const CACHE_PREFIX = 'scrollosaurus-';
export const precacheName = (version: string): string => `${CACHE_PREFIX}precache-${version}`;
export const imageCacheName = (imagesVersion: string): string =>
  `${CACHE_PREFIX}images-${imagesVersion}`;
export const SPECIES_CACHE = `${CACHE_PREFIX}species`;
/** Most images kept for offline use; the oldest go first (about 10 MB at the sizes we ship). */
export const MAX_IMAGES = 200;
/** How long a page load waits for the network before the cached shell is used (a weak signal). */
export const NAVIGATION_TIMEOUT_MS = 4000;

export type Route = 'navigate' | 'precache' | 'species' | 'image';

/** How the service worker answers a request, or null to leave it to the network untouched. */
export function routeFor(
  req: { method: string; mode: string; url: string },
  origin: string,
  build: SwBuild,
): Route | null {
  if (req.method !== 'GET') return null;
  const url = new URL(req.url);
  if (url.origin !== origin || !url.pathname.startsWith(build.base)) return null;
  if (req.mode === 'navigate') return 'navigate';
  // Hashed asset URLs carry no query; anything with one isn't ours to cache.
  if (url.search) return null;
  if (build.precache.includes(url.pathname)) return 'precache';
  if (build.speciesChunks.includes(url.pathname)) return 'species';
  if (url.pathname.startsWith(`${build.base}images/`)) return 'image';
  return null;
}

/** The cached page shell for a page: the Polish one under pl/, else the English one. */
export function shellFor(pathname: string, base: string): string {
  const pl = `${base}pl`;
  return pathname === pl || pathname.startsWith(`${pl}/`) ? `${pl}/` : base;
}

/**
 * Caches this site made for an older build or image set (other sites on the origin, and caches
 * of another name, are left alone).
 */
export function staleCaches(names: readonly string[], build: SwBuild): string[] {
  const current = [precacheName(build.version), imageCacheName(build.imagesVersion)];
  return names.filter(
    (n) =>
      (n.startsWith(`${CACHE_PREFIX}precache-`) || n.startsWith(`${CACHE_PREFIX}images-`)) &&
      !current.includes(n),
  );
}

/**
 * Files a page shell loads from assets/ that the precache doesn't have. Not empty means the shell
 * and sw.js come from different deploys (the host was mid-update), so the install must fail and
 * be retried rather than leave a shell that can't start offline.
 */
export function shellAssetsMissing(html: string, build: SwBuild): string[] {
  const assets = `${build.base}assets/`;
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1] ?? '')
    .filter((path) => path.startsWith(assets) && !build.precache.includes(path));
}

/** The oldest entries beyond `max` (cache keys come back in insertion order). */
export function overflow<T>(keys: readonly T[], max: number): T[] {
  return keys.length > max ? keys.slice(0, keys.length - max) : [];
}

/** Messages a page sends its service worker (src/lib/pwa.ts and src/lib/pwa-register.ts). */
export type SwMessage = { type: 'SKIP_WAITING' } | { type: 'CACHE_URLS'; urls: string[] };

/** The message in `data`, or null when it isn't one of ours. */
export function parseMessage(data: unknown): SwMessage | null {
  if (typeof data !== 'object' || data === null || !('type' in data)) return null;
  if (data.type === 'SKIP_WAITING') return { type: 'SKIP_WAITING' };
  if (data.type === 'CACHE_URLS' && 'urls' in data && Array.isArray(data.urls)) {
    return {
      type: 'CACHE_URLS',
      urls: data.urls.filter((u): u is string => typeof u === 'string'),
    };
  }
  return null;
}

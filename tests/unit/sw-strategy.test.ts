import { describe, expect, it } from 'vitest';
import {
  imageCacheName,
  overflow,
  parseMessage,
  precacheName,
  routeFor,
  shellAssetsMissing,
  shellFor,
  staleCaches,
  type SwBuild,
} from '@/sw/strategy';

const ORIGIN = 'https://example.org';
const build: SwBuild = {
  version: 'abc123',
  base: '/scrollosaurus/',
  precache: ['/scrollosaurus/', '/scrollosaurus/pl/', '/scrollosaurus/assets/index-x.js'],
  speciesChunks: ['/scrollosaurus/assets/tyrannosaurus-y.js'],
  imagesVersion: 'img1',
};
const get = (path: string, mode = 'cors') => ({
  method: 'GET',
  mode,
  url: `${ORIGIN}${path}`,
});

describe('service worker routing', () => {
  it('answers page loads inside the site', () => {
    expect(routeFor(get('/scrollosaurus/species/allosaurus/', 'navigate'), ORIGIN, build)).toBe(
      'navigate',
    );
    expect(routeFor(get('/scrollosaurus/pl/?diet=carnivore', 'navigate'), ORIGIN, build)).toBe(
      'navigate',
    );
    // Outside the worker's scope anyway; the router keeps the trailing slash (ADR-0003 §5).
    expect(routeFor(get('/scrollosaurus?from=130&to=119', 'navigate'), ORIGIN, build)).toBeNull();
  });

  it('serves precached files, species chunks and images', () => {
    expect(routeFor(get('/scrollosaurus/assets/index-x.js'), ORIGIN, build)).toBe('precache');
    expect(routeFor(get('/scrollosaurus/assets/tyrannosaurus-y.js'), ORIGIN, build)).toBe(
      'species',
    );
    expect(routeFor(get('/scrollosaurus/images/04026b63fda3-640.webp'), ORIGIN, build)).toBe(
      'image',
    );
  });

  it('leaves everything else to the network', () => {
    expect(routeFor(get('/other-site/', 'navigate'), ORIGIN, build)).toBeNull();
    expect(
      routeFor(
        { ...get('/scrollosaurus/'), url: 'https://elsewhere.org/scrollosaurus/' },
        ORIGIN,
        build,
      ),
    ).toBeNull();
    expect(
      routeFor({ ...get('/scrollosaurus/assets/index-x.js'), method: 'POST' }, ORIGIN, build),
    ).toBeNull();
    expect(routeFor(get('/scrollosaurus/assets/index-x.js?v=2'), ORIGIN, build)).toBeNull();
    expect(routeFor(get('/scrollosaurus/assets/old-chunk.js'), ORIGIN, build)).toBeNull();
    expect(routeFor(get('/scrollosaurus/sw.js'), ORIGIN, build)).toBeNull();
  });
});

describe('offline page shell', () => {
  it('picks the Polish shell for pages under pl/', () => {
    expect(shellFor('/scrollosaurus/pl', '/scrollosaurus/')).toBe('/scrollosaurus/pl/');
    expect(shellFor('/scrollosaurus/pl/species/allosaurus/', '/scrollosaurus/')).toBe(
      '/scrollosaurus/pl/',
    );
  });

  it('picks the English shell otherwise', () => {
    expect(shellFor('/scrollosaurus/', '/scrollosaurus/')).toBe('/scrollosaurus/');
    expect(shellFor('/scrollosaurus', '/scrollosaurus/')).toBe('/scrollosaurus/');
    expect(shellFor('/scrollosaurus/places/', '/scrollosaurus/')).toBe('/scrollosaurus/');
    expect(shellFor('/scrollosaurus/about/', '/scrollosaurus/')).toBe('/scrollosaurus/');
  });

  it('works at the root of a custom domain', () => {
    expect(shellFor('/pl/credits/', '/')).toBe('/pl/');
    expect(shellFor('/credits/', '/')).toBe('/');
  });
});

describe('cache housekeeping', () => {
  it('removes only older precaches and image sets of this site', () => {
    const names = [
      precacheName('abc123'),
      precacheName('old999'),
      imageCacheName('img1'),
      imageCacheName('img0'),
      'scrollosaurus-species',
      'someone-else',
    ];
    expect(staleCaches(names, build)).toEqual([precacheName('old999'), imageCacheName('img0')]);
  });

  it('notices a page shell from another deploy', () => {
    const shell = (entry: string) =>
      `<script type="module" crossorigin src="${entry}"></script><link rel="icon" href="/scrollosaurus/favicon.svg">`;
    expect(shellAssetsMissing(shell('/scrollosaurus/assets/index-x.js'), build)).toEqual([]);
    expect(shellAssetsMissing(shell('/scrollosaurus/assets/index-new.js'), build)).toEqual([
      '/scrollosaurus/assets/index-new.js',
    ]);
  });

  it('evicts the oldest entries beyond the limit', () => {
    expect(overflow(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
    expect(overflow(['a', 'b'], 2)).toEqual([]);
  });
});

describe('messages from the page', () => {
  it('accepts only known messages', () => {
    expect(parseMessage({ type: 'SKIP_WAITING' })).toEqual({ type: 'SKIP_WAITING' });
    expect(parseMessage({ type: 'CACHE_URLS', urls: ['/a', 3, null, '/b'] })).toEqual({
      type: 'CACHE_URLS',
      urls: ['/a', '/b'],
    });
    expect(parseMessage({ type: 'CACHE_URLS', urls: '/a' })).toBeNull();
    expect(parseMessage({ type: 'CLEAR_ALL' })).toBeNull();
    expect(parseMessage('SKIP_WAITING')).toBeNull();
    expect(parseMessage(null)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { STATIC_PATHS } from '@/app/static-paths';

function collectPaths(list: typeof routes): string[] {
  return list.flatMap((r) => [
    // Parametrised paths (species/:slug) get their pages from data, not from STATIC_PATHS.
    ...(r.path && r.path !== '*' && !r.path.includes(':') ? [r.path] : []),
    ...(r.children ? collectPaths(r.children) : []),
  ]);
}

describe('static paths', () => {
  it('lists every named route, so each gets an index.html on GitHub Pages', () => {
    expect([...collectPaths(routes)].sort()).toEqual([...STATIC_PATHS].sort());
  });
});

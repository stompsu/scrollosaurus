import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const DIST = join(import.meta.dirname, '..', '..', 'dist');
const BASE_PATH = process.env.BASE_PATH ?? '/scrollosaurus/';

/**
 * Gzip budget for the entry chunk, in kB of 1000 bytes, measured with Node's zlib at its default
 * level (this reads about 2 kB below the figure `vite build` prints). Phase 6 shipped 212.8 kB by
 * Vite's count; loading the Polish strings on demand brought the entry to 208.1 kB by this one.
 * Raise it only with a reason in the PR (ADR-0001 §9).
 */
const ENTRY_GZIP_BUDGET_KB = 211;

/** The module scripts the HTML file at `path` (relative to dist/) loads, e.g. "assets/index-x.js". */
function entryScripts(path: string): string[] {
  const html = readFileSync(join(DIST, path), 'utf8');
  return [...html.matchAll(/<script type="module"[^>]*src="[^"]*\/(assets\/[^"]+\.js)"/g)].map(
    (m) => m[1] ?? '',
  );
}

test.describe('built bundle', () => {
  test.skip(({ isMobile }) => isMobile, 'checks the built files once');

  test('the entry bundle does not ship Zod (data is validated at build time)', () => {
    const entries = entryScripts('index.html');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(readFileSync(join(DIST, entry), 'utf8')).not.toContain('ZodType');
    }
  });

  test(`the entry chunk stays within ${String(ENTRY_GZIP_BUDGET_KB)} kB gzip`, () => {
    const entries = entryScripts('index.html');
    expect(entries.length).toBeGreaterThan(0);
    const kb =
      entries.reduce((sum, e) => sum + gzipSync(readFileSync(join(DIST, e))).length, 0) / 1000;
    test.info().annotations.push({ type: 'entry gzip', description: `${kb.toFixed(1)} kB` });
    expect(kb).toBeLessThanOrEqual(ENTRY_GZIP_BUDGET_KB);
  });

  test('Polish strings are a separate chunk, preloaded only by the Polish pages', () => {
    const [chunk, ...extra] = readdirSync(join(DIST, 'assets')).filter((f) =>
      /^i18n-pl-[\w-]+\.js$/.test(f),
    );
    expect(chunk).toBeDefined();
    expect(extra).toEqual([]);
    const preload = `rel="modulepreload" crossorigin href="${BASE_PATH}assets/${chunk ?? ''}"`;
    for (const entry of entryScripts('index.html')) {
      // A Polish-only string: the entry must not contain the Polish translations.
      expect(readFileSync(join(DIST, entry), 'utf8')).not.toContain('Przejdź do treści');
    }
    for (const page of ['index.html', 'species/tyrannosaurus/index.html', '404.html']) {
      expect(readFileSync(join(DIST, page), 'utf8')).not.toContain('i18n-pl-');
    }
    for (const page of [
      'pl/index.html',
      'pl/species/tyrannosaurus/index.html',
      'pl/about/index.html',
    ]) {
      expect(readFileSync(join(DIST, page), 'utf8')).toContain(preload);
    }
  });
});

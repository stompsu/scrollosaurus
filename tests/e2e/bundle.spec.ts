import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const DIST = join(import.meta.dirname, '..', '..', 'dist');

test('the entry bundle does not ship Zod (data is validated at build time)', ({ isMobile }) => {
  test.skip(isMobile, 'checks the built files once');
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const entries = [...html.matchAll(/src="[^"]*\/(assets\/[^"]+\.js)"/g)].map((m) => m[1] ?? '');
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(readFileSync(join(DIST, entry), 'utf8')).not.toContain('ZodType');
  }
});

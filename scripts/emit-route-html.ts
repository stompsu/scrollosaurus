/**
 * After `vite build`, writes dist/<path>/index.html for every static route so GitHub Pages
 * serves deep links with a 200 status. dist/404.html renders the app's not-found page.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STATIC_PATHS } from '../src/app/static-paths.ts';

const DIST = join(import.meta.dirname, '..', 'dist');
const indexHtml = join(DIST, 'index.html');

for (const path of STATIC_PATHS) {
  const dir = join(DIST, path);
  await mkdir(dir, { recursive: true });
  await copyFile(indexHtml, join(dir, 'index.html'));
}
await copyFile(indexHtml, join(DIST, '404.html'));
// Tell GitHub Pages not to run Jekyll over the output.
await writeFile(join(DIST, '.nojekyll'), '');

console.log(`✓ Wrote index.html for ${STATIC_PATHS.length} route(s) + 404.html`);

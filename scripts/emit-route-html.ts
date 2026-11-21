/**
 * After `vite build`, writes dist/<path>/index.html for every static route so GitHub Pages
 * serves deep links with a 200 status. dist/404.html renders the app's not-found page.
 */
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STATIC_PATHS } from '../src/app/static-paths.ts';

const DIST = join(import.meta.dirname, '..', 'dist');
const SPECIES_DIR = join(import.meta.dirname, '..', 'data', 'species');
const indexHtml = join(DIST, 'index.html');

// One page per species file: data/species/<slug>.json → /species/<slug>/.
const speciesPaths = (await readdir(SPECIES_DIR))
  .filter((f) => f.endsWith('.json'))
  .map((f) => `species/${f.slice(0, -'.json'.length)}`);
const paths = [...STATIC_PATHS, ...speciesPaths];

for (const path of paths) {
  const dir = join(DIST, path);
  await mkdir(dir, { recursive: true });
  await copyFile(indexHtml, join(dir, 'index.html'));
}
await copyFile(indexHtml, join(DIST, '404.html'));
// Tell GitHub Pages not to run Jekyll over the output.
await writeFile(join(DIST, '.nojekyll'), '');

console.log(
  `✓ Wrote index.html for ${String(STATIC_PATHS.length)} route(s), ${String(speciesPaths.length)} species + 404.html`,
);

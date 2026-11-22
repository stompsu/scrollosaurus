/**
 * After `vite build`, writes dist/<path>/index.html for every static route so GitHub Pages
 * serves deep links with a 200 status, in English and under pl/ in Polish (with lang="pl" in the
 * HTML, so the language is right before the app starts). dist/404.html renders the not-found page.
 */
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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

const html = await readFile(indexHtml, 'utf8');
if (!html.includes('<html lang="en">')) throw new Error('index.html has no <html lang="en">');
const polishHtml = html.replace('<html lang="en">', '<html lang="pl">');

for (const path of paths) {
  const dir = join(DIST, path);
  await mkdir(dir, { recursive: true });
  await copyFile(indexHtml, join(dir, 'index.html'));
}
for (const path of ['', ...paths]) {
  const dir = join(DIST, 'pl', path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), polishHtml);
}
await copyFile(indexHtml, join(DIST, '404.html'));
// Tell GitHub Pages not to run Jekyll over the output.
await writeFile(join(DIST, '.nojekyll'), '');

console.log(
  `✓ Wrote index.html for ${String(STATIC_PATHS.length)} route(s) and ${String(speciesPaths.length)} species, in English and Polish, + 404.html`,
);

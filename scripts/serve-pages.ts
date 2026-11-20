/**
 * Minimal static server that mimics GitHub Pages for e2e tests: serves dist/ under BASE_PATH,
 * resolves directories to index.html, and answers unknown paths with 404.html and status 404.
 * Unlike `vite preview`, it has no SPA fallback, so missing per-route HTML shows up as a 404.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const BASE = process.env.BASE_PATH ?? '/scrollosaurus/';
const PORT = Number(process.env.PORT ?? 4173);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath: string): Promise<string | null> {
  if (!urlPath.startsWith(BASE)) return null;
  const rel = normalize(decodeURIComponent(urlPath.slice(BASE.length)));
  if (rel.startsWith('..')) return null;
  const candidate = join(DIST, rel);
  try {
    const s = await stat(candidate);
    if (s.isFile()) return candidate;
    if (s.isDirectory()) {
      const index = join(candidate, 'index.html');
      if ((await stat(index)).isFile()) return index;
    }
  } catch {
    // Not found.
  }
  return null;
}

createServer((req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  // Pages redirects /scrollosaurus to /scrollosaurus/.
  if (`${urlPath}/` === BASE) {
    res.writeHead(301, { Location: BASE }).end();
    return;
  }
  void resolveFile(urlPath).then((file) => {
    const path = file ?? join(DIST, '404.html');
    res.writeHead(file ? 200 : 404, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    });
    createReadStream(path).pipe(res);
  });
}).listen(PORT, () => {
  console.log(`Serving dist/ like GitHub Pages at http://localhost:${PORT}${BASE}`);
});

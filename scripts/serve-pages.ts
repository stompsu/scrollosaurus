/**
 * Minimal static server that mimics GitHub Pages for e2e tests: serves dist/ under BASE_PATH,
 * redirects directories without a trailing slash (301, as Pages does), resolves directories to
 * index.html, and answers unknown paths with 404.html and status 404.
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

type Resolved = { kind: 'file'; path: string } | { kind: 'redirect'; location: string } | null;

async function resolve(urlPath: string, search: string): Promise<Resolved> {
  // Pages redirects /scrollosaurus to /scrollosaurus/.
  if (`${urlPath}/` === BASE) return { kind: 'redirect', location: `${BASE}${search}` };
  if (!urlPath.startsWith(BASE)) return null;
  const rel = normalize(decodeURIComponent(urlPath.slice(BASE.length)));
  if (rel.startsWith('..')) return null;
  const candidate = join(DIST, rel);
  try {
    const s = await stat(candidate);
    if (s.isFile()) return { kind: 'file', path: candidate };
    if (s.isDirectory()) {
      const index = join(candidate, 'index.html');
      if ((await stat(index)).isFile()) {
        // Pages answers /about with a 301 to /about/ before serving about/index.html.
        return urlPath.endsWith('/')
          ? { kind: 'file', path: index }
          : { kind: 'redirect', location: `${urlPath}/${search}` };
      }
    }
  } catch {
    // Not found.
  }
  return null;
}

createServer((req, res) => {
  const { pathname: urlPath, search } = new URL(req.url ?? '/', 'http://localhost');
  void resolve(urlPath, search).then((found) => {
    if (found?.kind === 'redirect') {
      res.writeHead(301, { Location: found.location }).end();
      return;
    }
    const path = found?.path ?? join(DIST, '404.html');
    res.writeHead(found ? 200 : 404, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    });
    createReadStream(path).pipe(res);
  });
}).listen(PORT, () => {
  console.log(`Serving dist/ like GitHub Pages at http://localhost:${PORT}${BASE}`);
});

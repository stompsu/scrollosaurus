/**
 * Makes the production build an installable, offline-capable web app (ADR-0003), with no
 * dependency beyond Vite and sharp:
 *
 * - renders the app icons from public/favicon.svg (our own artwork) into dist/icons/;
 * - writes one web app manifest per language (manifest.webmanifest, pl/manifest.webmanifest) that
 *   share one `id`, so they are one installed app named in the language it was installed from;
 * - links the English manifest and the touch icon from index.html (scripts/emit-route-html.ts
 *   points the Polish pages at the Polish manifest);
 * - builds src/sw/sw.ts to dist/sw.js and gives it this build's precache and species-chunk lists.
 *
 * Every URL is built from Vite's `base`. Build only: the dev server never registers a worker.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import type { SwBuild } from '../src/sw/strategy.ts';

const ROOT = join(import.meta.dirname, '..');
const SW_SOURCE = join(ROOT, 'src', 'sw', 'sw.ts');
const SW_FILE = 'sw.js';
const SPECIES_DIR = join(ROOT, 'data', 'species');
/** Font subsets the site's English and Polish text needs; others load on demand from the network. */
const PRECACHED_FONTS = /-latin(-ext)?-wght-normal-[\w-]+\.woff2$/;

export const MANIFEST_FILE = 'manifest.webmanifest';
export const ICONS = {
  any192: 'icons/icon-192.png',
  any512: 'icons/icon-512.png',
  maskable512: 'icons/icon-maskable-512.png',
  apple: 'icons/apple-touch-icon.png',
} as const;

type Lang = 'en' | 'pl';

interface SiteStrings {
  site: { name: string; description: string };
}

function readStrings(lang: Lang): SiteStrings {
  const path = join(ROOT, 'data', 'i18n', lang, 'common.json');
  // Shape checked just below; the strings themselves are validated by `pnpm validate:data`.
  const strings = JSON.parse(readFileSync(path, 'utf8')) as Partial<SiteStrings>;
  if (!strings.site?.name || !strings.site.description) {
    throw new Error(`vite-pwa: ${path} needs site.name and site.description for the manifest`);
  }
  return strings as SiteStrings;
}

/** The dark theme's background token (`--sc-bg` in the first :root block), the default theme. */
function darkBackground(): string {
  const css = readFileSync(join(ROOT, 'src', 'styles', 'index.css'), 'utf8');
  const match = /:root\s*\{[^}]*--sc-bg:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(css);
  if (!match?.[1]) throw new Error('vite-pwa: no --sc-bg in the :root block of index.css');
  return match[1];
}

/**
 * A full-bleed version of the favicon for maskable and touch icons: square corners, and the
 * period stripes scaled to 75% so they stay inside the 80% safe zone platforms may crop to.
 */
export function maskableSvg(favicon: string): string {
  const out = favicon
    .replace(/(<rect width="32" height="32") rx="\d+"/, '$1')
    .replace(
      /(<rect width="32" height="32"[^>]*\/>)(.*)<\/svg>$/s,
      (_m, bg: string, rest: string) =>
        `${bg}<g transform="translate(16 16) scale(0.75) translate(-16 -16)">${rest}</g></svg>`,
    );
  if (out === favicon || out.includes('rx=') || !out.includes('<g transform')) {
    throw new Error('vite-pwa: favicon.svg no longer has the expected background <rect>');
  }
  return out;
}

export function manifestFor(lang: Lang, base: string, color: string): Record<string, unknown> {
  const { site } = readStrings(lang);
  return {
    // One id for both languages: installing from either gives the same app.
    id: base,
    name: site.name,
    short_name: site.name,
    description: site.description,
    lang,
    dir: 'ltr',
    start_url: lang === 'pl' ? `${base}pl/` : base,
    scope: base,
    display: 'standalone',
    background_color: color,
    theme_color: color,
    icons: [
      { src: `${base}${ICONS.any192}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}${ICONS.any512}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: `${base}${ICONS.maskable512}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: `${base}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}

function speciesModule(id: string | null): boolean {
  return id?.startsWith(SPECIES_DIR) === true && id.endsWith('.json');
}

/** The parts of Vite's output bundle the version hash reads. */
type BundleFiles = Record<
  string,
  { type: 'chunk'; code: string } | { type: 'asset'; source: string | Uint8Array }
>;

/** Hash of every built file, so any change to the build gives the service worker a new version. */
function versionOf(bundle: BundleFiles, publicFiles: readonly string[]): string {
  const hash = createHash('sha256');
  for (const name of Object.keys(bundle).sort()) {
    if (name === SW_FILE) continue;
    const file = bundle[name];
    if (!file) continue;
    hash.update(name);
    hash.update(file.type === 'chunk' ? file.code : file.source);
  }
  // Precached files Vite copies from public/ without bundling them.
  for (const name of publicFiles) {
    hash.update(name);
    hash.update(readFileSync(join(ROOT, 'public', name)));
  }
  return hash.digest('hex').slice(0, 12);
}

/** Hash of every file under public/images (names and contents; about 37 MB, well under a second). */
function imagesVersionOf(): string {
  const dir = join(ROOT, 'public', 'images');
  const hash = createHash('sha256');
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      hash.update(name);
      hash.update(readFileSync(join(dir, name)));
    }
  }
  return hash.digest('hex').slice(0, 12);
}

/** Unhashed files from public/ that the service worker precaches. */
const PUBLIC_PRECACHE = ['theme-init.js', 'favicon.svg'] as const;

export function pwaPlugin(base: string): Plugin {
  return {
    name: 'scrollosaurus:pwa',
    apply: 'build',
    buildStart() {
      this.emitFile({ type: 'chunk', id: SW_SOURCE, fileName: SW_FILE });
    },
    transformIndexHtml: () => [
      {
        tag: 'link',
        attrs: { rel: 'manifest', href: `${base}${MANIFEST_FILE}` },
        injectTo: 'head',
      },
      {
        tag: 'link',
        attrs: { rel: 'apple-touch-icon', href: `${base}${ICONS.apple}` },
        injectTo: 'head',
      },
    ],
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const { default: sharp } = await import('sharp');
        const favicon = readFileSync(join(ROOT, 'public', 'favicon.svg'), 'utf8').trim();
        const maskable = maskableSvg(favicon);
        const render = (svg: string, size: number) =>
          // The SVG is 32 units wide: render at the density that makes it `size` pixels.
          sharp(Buffer.from(svg), { density: (72 * size) / 32 })
            .resize(size, size)
            .png({ compressionLevel: 9 })
            .toBuffer();
        const icons: [string, Buffer][] = [
          [ICONS.any192, await render(favicon, 192)],
          [ICONS.any512, await render(favicon, 512)],
          [ICONS.maskable512, await render(maskable, 512)],
          [ICONS.apple, await render(maskable, 180)],
        ];
        for (const [fileName, source] of icons) this.emitFile({ type: 'asset', fileName, source });

        const color = darkBackground();
        for (const lang of ['en', 'pl'] as const) {
          this.emitFile({
            type: 'asset',
            fileName: lang === 'pl' ? `pl/${MANIFEST_FILE}` : MANIFEST_FILE,
            source: `${JSON.stringify(manifestFor(lang, base, color), null, 2)}\n`,
          });
        }

        const precache = new Set<string>([
          base,
          `${base}pl/`,
          ...PUBLIC_PRECACHE.map((name) => `${base}${name}`),
          `${base}${MANIFEST_FILE}`,
          `${base}pl/${MANIFEST_FILE}`,
          ...icons.map(([fileName]) => `${base}${fileName}`),
        ]);
        const speciesChunks: string[] = [];
        for (const file of Object.values(bundle)) {
          if (file.fileName === SW_FILE || file.fileName.endsWith('.html')) continue;
          if (file.type === 'chunk') {
            if (speciesModule(file.facadeModuleId)) speciesChunks.push(`${base}${file.fileName}`);
            else precache.add(`${base}${file.fileName}`);
          } else if (file.fileName.startsWith('assets/')) {
            if (!file.fileName.endsWith('.woff2') || PRECACHED_FONTS.test(file.fileName)) {
              precache.add(`${base}${file.fileName}`);
            }
          }
        }

        const sw = bundle[SW_FILE];
        if (sw?.type !== 'chunk') throw new Error('vite-pwa: sw.js was not built');
        // Classic service workers can't import: the worker must be one self-contained file.
        if (sw.imports.length > 0 || sw.dynamicImports.length > 0 || sw.exports.length > 0) {
          throw new Error('vite-pwa: sw.js must not import or export anything');
        }
        if (!sw.code.includes('__SC_BUILD__'))
          throw new Error('vite-pwa: no __SC_BUILD__ in sw.js');
        const swBuild: SwBuild = {
          version: versionOf(bundle, PUBLIC_PRECACHE),
          base,
          precache: [...precache].sort(),
          speciesChunks: speciesChunks.sort(),
          imagesVersion: imagesVersionOf(),
        };
        sw.code = sw.code.replaceAll('__SC_BUILD__', JSON.stringify(swBuild));
      },
    },
  };
}

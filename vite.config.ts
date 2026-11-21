/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import type { Groups } from './src/lib/schemas/groups';
import type { Species } from './src/lib/schemas/species';
import { buildSpeciesIndex } from './src/lib/species-index';

/** GitHub Pages serves the repo at /scrollosaurus/. Override with BASE_PATH (e.g. "/" for a custom domain). */
const base = process.env.BASE_PATH ?? '/scrollosaurus/';

/**
 * Content Security Policy for the static build. GitHub Pages can't send headers, so it goes in a
 * <meta> tag (frame-ancestors isn't supported there). Build-only: the dev server injects inline
 * styles and scripts for HMR.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspMeta(): Plugin {
  return {
    name: 'scrollosaurus:csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

/**
 * Serves `virtual:species-index`: the compact species index, built from data/ on every dev load and
 * build. The data is validated by `pnpm validate:data` before each build; this plugin only reshapes.
 */
function speciesIndexPlugin(): Plugin {
  const id = 'virtual:species-index';
  const resolved = `\0${id}`;
  const dataDir = fileURLToPath(new URL('./data', import.meta.url));
  const speciesDir = join(dataDir, 'species');
  const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;
  return {
    name: 'scrollosaurus:species-index',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loadId) {
      if (loadId !== resolved) return undefined;
      const files = readdirSync(speciesDir).filter((f) => f.endsWith('.json'));
      for (const f of files) this.addWatchFile(join(speciesDir, f));
      this.addWatchFile(join(dataDir, 'groups.json'));
      const species = files.map((f) => readJson(join(speciesDir, f)) as Species);
      const groups = readJson(join(dataDir, 'groups.json')) as Groups;
      return `export const speciesIndex = ${JSON.stringify(buildSpeciesIndex(species, groups))};`;
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), cspMeta(), speciesIndexPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
  },
});

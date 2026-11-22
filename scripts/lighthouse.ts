/**
 * Lighthouse on the production build, served like GitHub Pages (scripts/serve-pages.ts). Uses
 * Lighthouse's default mobile emulation and throttling. Fails when Performance is below the
 * Phase 5 target of 90 on any page, and rewrites the table in docs/perf/lighthouse.md.
 *
 *   pnpm lighthouse        # builds first (see package.json)
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { format, resolveConfig } from 'prettier';

const PORT = 4176;
const DEBUG_PORT = 9333;
const BASE = `http://localhost:${String(PORT)}/scrollosaurus/`;
/** English pages, then Polish ones (which also load the Polish strings chunk). */
const PAGES = ['', 'species/tyrannosaurus/', 'credits/', 'pl/', 'pl/species/tyrannosaurus/'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
const TARGET = 0.9;
const DOC = join(import.meta.dirname, '..', 'docs', 'perf', 'lighthouse.md');

// Spawn tsx itself (not through pnpm), so killing this process stops the server.
const server = spawn(
  join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx'),
  ['scripts/serve-pages.ts'],
  {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  },
);
process.on('exit', () => server.kill());
await new Promise<void>((resolve, reject) => {
  server.stdout.on('data', (chunk: Buffer) => {
    if (chunk.toString().includes('Serving')) resolve();
  });
  server.on('exit', (code) => {
    reject(new Error(`static server exited (${String(code)})`));
  });
});

const rows: string[] = [];
let failed = false;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  browser = await chromium.launch({ args: [`--remote-debugging-port=${String(DEBUG_PORT)}`] });
  for (const page of PAGES) {
    const result = await lighthouse(`${BASE}${page}`, {
      port: DEBUG_PORT,
      output: 'json',
      logLevel: 'error',
      onlyCategories: [...CATEGORIES],
    });
    if (!result) throw new Error(`no Lighthouse result for /${page}`);
    const scores = CATEGORIES.map((c) => Math.round((result.lhr.categories[c]?.score ?? 0) * 100));
    const lcp = result.lhr.audits['largest-contentful-paint']?.displayValue ?? '?';
    const cls = result.lhr.audits['cumulative-layout-shift']?.displayValue ?? '?';
    const tbt = result.lhr.audits['total-blocking-time']?.displayValue ?? '?';
    if ((scores[0] ?? 0) < TARGET * 100) failed = true;
    rows.push(`| /${page} | ${scores.join(' | ')} | ${lcp} | ${tbt} | ${cls} |`);
    console.log(`/${page}: ${CATEGORIES.map((c, i) => `${c} ${String(scores[i])}`).join(', ')}`);
  }
} finally {
  await browser?.close();
  server.kill();
}

const table = [
  '| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |',
  '| ---- | ----------- | ------------- | -------------- | --- | --- | --- | --- |',
  ...rows,
].join('\n');
const doc = await readFile(DOC, 'utf8').catch(() => '');
const marked = /<!-- lighthouse:start -->[\s\S]*<!-- lighthouse:end -->/;
const block = `<!-- lighthouse:start -->\n${table}\n<!-- lighthouse:end -->`;
const updated = marked.test(doc) ? doc.replace(marked, block) : `${doc}\n${block}\n`;
// Formatted like the rest of docs/, so `pnpm lint` stays green after a run.
await writeFile(DOC, await format(updated, { ...(await resolveConfig(DOC)), filepath: DOC }));

if (failed) {
  console.error(`\n✗ Performance below ${String(TARGET * 100)} on at least one page`);
  process.exitCode = 1;
}

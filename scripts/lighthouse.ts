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

const PORT = 4176;
const DEBUG_PORT = 9333;
const BASE = `http://localhost:${String(PORT)}/scrollosaurus/`;
const PAGES = ['', 'species/tyrannosaurus/', 'credits/'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
const TARGET = 0.9;
const DOC = join(import.meta.dirname, '..', 'docs', 'perf', 'lighthouse.md');

const server = spawn('pnpm', ['exec', 'tsx', 'scripts/serve-pages.ts'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise<void>((resolve, reject) => {
  server.stdout.on('data', (chunk: Buffer) => {
    if (chunk.toString().includes('Serving')) resolve();
  });
  server.on('exit', (code) => {
    reject(new Error(`static server exited (${String(code)})`));
  });
});

const browser = await chromium.launch({ args: [`--remote-debugging-port=${String(DEBUG_PORT)}`] });
const rows: string[] = [];
let failed = false;
try {
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
  await browser.close();
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
await writeFile(DOC, marked.test(doc) ? doc.replace(marked, block) : `${doc}\n${block}\n`);

if (failed) {
  console.error(`\n✗ Performance below ${String(TARGET * 100)} on at least one page`);
  process.exitCode = 1;
}

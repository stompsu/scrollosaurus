import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = process.env.BASE_PATH ?? '/scrollosaurus/';

/**
 * `pnpm perf` sets PERF=1: it builds with the 300-item fixture (VITE_PERF_FIXTURE=1) into a
 * directory outside dist/, serves it on its own port and runs only *.perf.spec.ts, one test at a
 * time. The default run ignores the perf specs and never builds the fixture.
 */
const PERF = process.env.PERF === '1';
const PORT = PERF ? 4174 : 4173;
const PERF_DIST = 'node_modules/.cache/scrollosaurus-perf';

export default defineConfig({
  testDir: 'tests/e2e',
  ...(PERF
    ? { testMatch: '**/*.perf.spec.ts', workers: 1, timeout: 180_000 }
    : { testIgnore: '**/*.perf.spec.ts' }),
  fullyParallel: !PERF,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Builds the real static output and serves it the way GitHub Pages does (no SPA fallback).
  webServer: PERF
    ? {
        command: `vite build --outDir ${PERF_DIST} --emptyOutDir && tsx scripts/serve-pages.ts`,
        url: `http://localhost:${PORT}${BASE_PATH}`,
        env: { PORT: String(PORT), BASE_PATH, DIST_DIR: PERF_DIST, VITE_PERF_FIXTURE: '1' },
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: `pnpm build && tsx scripts/serve-pages.ts`,
        url: `http://localhost:${PORT}${BASE_PATH}`,
        env: { PORT: String(PORT), BASE_PATH },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

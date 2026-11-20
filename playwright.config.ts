import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_PATH = process.env.BASE_PATH ?? '/scrollosaurus/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
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
  webServer: {
    command: `pnpm build && tsx scripts/serve-pages.ts`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    env: { PORT: String(PORT), BASE_PATH },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

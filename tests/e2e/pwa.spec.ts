import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The installable, offline-capable site (ADR-0003). Other specs block service workers (see
 * playwright.config.ts) so their network checks see every request; this one allows them.
 * Desktop only: one Chromium run is enough, and the update test edits dist/sw.js.
 */
test.use({ serviceWorkers: 'allow' });
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'service-worker checks run once, on desktop');

const DIST = join(import.meta.dirname, '..', '..', 'dist');
const BASE_PATH = process.env.BASE_PATH ?? '/scrollosaurus/';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer): [number, number] {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

/** Every HTML file the build wrote, relative to dist/. */
function htmlFiles(dir = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'images' ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [relative(DIST, path)] : [];
  });
}

/** Waits until the service worker controls the page and has saved the page's species chunk. */
async function waitForOffline(page: Page, speciesCached: boolean) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  if (!speciesCached) return;
  await expect
    .poll(() =>
      page.evaluate(async () => (await (await caches.open('scrollosaurus-species')).keys()).length),
    )
    .toBeGreaterThan(0);
}

test('each language has a valid web app manifest with real icons', async ({ request }) => {
  for (const [path, lang, start] of [
    ['manifest.webmanifest', 'en', BASE_PATH],
    ['pl/manifest.webmanifest', 'pl', `${BASE_PATH}pl/`],
  ] as const) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/manifest+json');
    const manifest = (await response.json()) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      id: BASE_PATH,
      name: 'Scrollosaurus',
      short_name: 'Scrollosaurus',
      lang,
      start_url: start,
      scope: BASE_PATH,
      display: 'standalone',
      theme_color: '#12100e',
      background_color: '#12100e',
    });
    expect(manifest.description).toEqual(expect.any(String));
    const icons = manifest.icons as ManifestIcon[];
    const png = icons.filter((icon) => icon.type === 'image/png');
    expect(png.map((i) => `${i.sizes} ${i.purpose}`).sort()).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ]);
    for (const icon of png) {
      expect(icon.src.startsWith(BASE_PATH)).toBe(true);
      const bytes = await (await request.get(icon.src.slice(BASE_PATH.length))).body();
      expect(pngSize(bytes).join('x')).toBe(icon.sizes);
    }
  }
});

test('every page links its language’s manifest and the touch icon', () => {
  const files = htmlFiles();
  expect(files.length).toBeGreaterThan(200);
  for (const file of files) {
    const html = readFileSync(join(DIST, file), 'utf8');
    const manifest = file.startsWith('pl/') ? 'pl/manifest.webmanifest' : 'manifest.webmanifest';
    expect(html, file).toContain(`<link rel="manifest" href="${BASE_PATH}${manifest}">`);
    expect(html, file).toContain(`rel="apple-touch-icon" href="${BASE_PATH}icons/`);
  }
});

test('Chrome finds the site installable', async ({ page }) => {
  await page.goto('');
  await waitForOffline(page, false);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
    installabilityErrors: { errorId: string }[];
  };
  expect(installabilityErrors).toEqual([]);
});

for (const [name, path, heading] of [
  ['the English home page', '', 'The Mesozoic, 252 to 66 million years ago'],
  ['an English species page', 'species/tyrannosaurus/', 'Tyrannosaurus'],
  ['a Polish species page', 'pl/species/tyrannosaurus/', 'Tyrannosaurus'],
] as const) {
  test(`${name} reloads offline once visited`, async ({ page, context }) => {
    await page.goto(path);
    await waitForOffline(page, path.includes('species/'));
    await context.setOffline(true);
    await page.reload();
    if (path.includes('species/')) {
      const drawer = page.getByTestId('species-drawer');
      await expect(drawer.getByRole('heading', { level: 2 })).toHaveText(heading);
      // The sources come from the species' own data chunk, so it was served from the cache.
      await expect(drawer.getByRole('heading', { name: /^(Sources|Źródła)$/ })).toBeVisible();
      await expect(drawer.getByRole('alert')).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
    if (path.startsWith('pl/')) await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await context.setOffline(false);
  });
}

test('pages not visited yet still open offline, in their language', async ({ page, context }) => {
  await page.goto('');
  await waitForOffline(page, false);
  await context.setOffline(true);
  await page.goto('about/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('pl/credits/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test('a new deploy is offered, not forced, and is accessible', async ({ page }) => {
  await page.goto('');
  await waitForOffline(page, false);
  await expect(page.getByTestId('update-notice')).toHaveCount(0);

  // Simulate a deploy: any change to sw.js makes the browser install it as a new version.
  const swPath = join(DIST, 'sw.js');
  const original = readFileSync(swPath, 'utf8');
  try {
    writeFileSync(swPath, `${original}\n// e2e: a new deploy\n`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    const notice = page.getByTestId('update-notice');
    await expect(notice).toBeVisible();
    await expect(page.getByRole('status')).toContainText('A new version of the site is ready.');
    const axe = await new AxeBuilder({ page }).include('[data-testid="update-notice"]').analyze();
    expect(axe.violations).toEqual([]);

    const reloaded = page.waitForEvent('load');
    await notice.getByRole('button', { name: 'Reload' }).click();
    await reloaded;
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('update-notice')).toHaveCount(0);
  } finally {
    writeFileSync(swPath, original);
  }
});

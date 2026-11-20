import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Any console error (including CSP violations) fails the test. The browser's own
// "Failed to load resource" log for the intentional 404 page is ignored.
let consoleErrors: string[] = [];

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('status of 404')) {
      consoleErrors.push(msg.text());
    }
  });
});

test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
});

test('home shows the three period bands', async ({ page }) => {
  await page.goto('./');
  const bands = page.getByRole('list', { name: /periods of the mesozoic/i }).getByRole('listitem');
  await expect(bands).toHaveCount(3);
  await expect(bands.first()).toContainText('Triassic');
  await expect(bands.last()).toContainText('Cretaceous');
});

test('bands run horizontally on desktop and vertically on mobile', async ({ page, isMobile }) => {
  await page.goto('./');
  const tri = await page.getByTestId('band-triassic').boundingBox();
  const jur = await page.getByTestId('band-jurassic').boundingBox();
  if (!tri || !jur) throw new Error('bands not rendered');
  if (isMobile) {
    expect(jur.y).toBeGreaterThan(tri.y);
  } else {
    expect(jur.x).toBeGreaterThan(tri.x);
  }
});

const pages = [
  { path: './', title: /^Scrollosaurus: / },
  { path: 'about', title: /^About · Scrollosaurus$/ },
  { path: 'credits', title: /^Credits · Scrollosaurus$/ },
];

for (const { path, title } of pages) {
  test(`${path} is served directly with 200, a unique title and no axe violations`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('a route without a trailing slash redirects like GitHub Pages', async ({ page }) => {
  const response = await page.goto('about');
  expect(response?.request().redirectedFrom()?.url()).toMatch(/\/about$/);
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
});

test('unknown paths return 404 and render an accessible not-found page', async ({ page }) => {
  const response = await page.goto('no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /lost in deep time/i })).toBeVisible();
  await expect(page).toHaveTitle(/Page not found/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('client-side navigation moves focus to the main content', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
});

test('skip link is the first tab stop and jumps to main', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard-only check');
  await page.goto('./');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

for (const width of [320, 360]) {
  for (const path of ['./', 'about', 'credits', 'no-such-page']) {
    test(`no horizontal scroll at ${width} px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

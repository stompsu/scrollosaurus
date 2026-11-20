import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home shows the three period bands', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/Scrollosaurus/);
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

for (const path of ['./', 'about', 'credits']) {
  test(`${path} loads directly and has no axe violations`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('unknown paths show the not-found page', async ({ page }) => {
  await page.goto('no-such-page');
  await expect(page.getByRole('heading', { name: /lost in deep time/i })).toBeVisible();
});

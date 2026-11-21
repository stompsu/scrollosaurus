import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SPECIES_DIR = join(import.meta.dirname, '..', '..', 'data', 'species');
const listed = readdirSync(SPECIES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(SPECIES_DIR, f), 'utf8')) as { images: unknown[] })
  .reduce((n, s) => n + s.images.length, 0);

let consoleErrors: string[] = [];
test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
});
test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
});

test('/credits credits every image, and every image loads', async ({ page }) => {
  await page.goto('credits');
  const items = page.getByTestId('image-credits').getByRole('listitem');
  await expect(items).toHaveCount(listed);
  for (const item of await items.all()) {
    const credit = item.getByTestId('image-credit');
    await expect(credit).toContainText(/^Image: .+, (Public domain|CC0|CC BY(-SA)? [\d.]+)/);
    await expect(credit.getByRole('link', { name: 'Wikimedia Commons' })).toHaveAttribute(
      'href',
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    const img = item.locator('img');
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBeGreaterThan(0);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the drawer shows the species image with its credit right below it', async ({ page }) => {
  await page.goto('species/tyrannosaurus');
  const drawer = page.getByTestId('species-drawer');
  const img = drawer.getByTestId('species-image');
  await expect(img).toHaveAttribute('alt', /Tyrannosaurus/);
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  const credit = drawer.getByTestId('image-credit');
  await expect(credit).toContainText('CC BY-SA 3.0');
  await expect(credit.getByRole('link', { name: 'CC BY-SA 3.0' })).toHaveAttribute(
    'href',
    /creativecommons\.org\/licenses\/by-sa\/3\.0/,
  );
  const imgBox = await img.boundingBox();
  const creditBox = await credit.boundingBox();
  if (!imgBox || !creditBox) throw new Error('image or credit not rendered');
  expect(creditBox.y).toBeGreaterThanOrEqual(imgBox.y + imgBox.height - 1);
  expect(creditBox.y - (imgBox.y + imgBox.height)).toBeLessThan(40);
});

test('images reserve their space before they load', async ({ page }) => {
  await page.route('**/images/**', (route) => route.abort());
  await page.goto('species/stegosaurus');
  const box = await page.getByTestId('species-drawer').getByTestId('species-image').boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(100);
  // Blocking the files above logs network errors on purpose.
  consoleErrors = [];
});

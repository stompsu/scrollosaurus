import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

let consoleErrors: string[] = [];
test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('status of 404')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
});
test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
});

test('Polish pages are served directly, in Polish, with lang="pl"', async ({ page }) => {
  for (const path of ['pl/', 'pl/about/', 'pl/credits/', 'pl/species/tyrannosaurus/']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  }
  await page.goto('pl/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Mezozoik, od 252 do 66 milionów lat temu',
  );
  await expect(page.getByTestId('timeline-window')).toContainText('mln lat temu');
});

test('numbers, places and units follow the language', async ({ page }) => {
  await page.goto('pl/species/sinosauropteryx');
  const drawer = page.getByTestId('species-drawer');
  await expect(drawer).toContainText('1,1 m');
  await expect(drawer).toContainText('Chiny (Azja)');
  await expect(drawer).toContainText('formacja Yixian');
  await page.goto('species/sinosauropteryx');
  await expect(page.getByTestId('species-drawer')).toContainText('China (Asia), Yixian Formation');
});

test('the switch keeps the page and its view, and the choice is remembered', async ({ page }) => {
  await page.goto('species/allosaurus?diet=carnivore');
  await page.keyboard.press('Escape');
  await page.getByTestId('language-switch').click();
  await expect(page).toHaveURL(/\/pl\?diet=carnivore/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  // A later visit to an English address follows the remembered choice.
  await page.goto('about/');
  await expect(page).toHaveURL(/\/pl\/about/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('O projekcie');
  await page.getByTestId('language-switch').click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('links inside a Polish page stay in Polish', async ({ page }) => {
  await page.goto('pl/species/tyrannosaurus');
  await page.getByTestId('species-drawer').getByRole('link', { name: 'Triceratops' }).click();
  await expect(page).toHaveURL(/\/pl\/species\/triceratops/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/pl\?/);
  await page.getByRole('navigation').getByRole('link', { name: 'O projekcie' }).click();
  await expect(page).toHaveURL(/\/pl\/about$/);
});

test('search finds Polish name meanings', async ({ page }) => {
  await page.goto('pl/');
  await page.getByRole('combobox', { name: 'Znajdź gatunek' }).fill('jaszczur');
  await expect(page.getByRole('option').first()).toBeVisible();
});

test('no axe violations in Polish', async ({ page }) => {
  for (const path of ['pl/', 'pl/species/stegosaurus', 'pl/credits/', 'pl/?tour=2']) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

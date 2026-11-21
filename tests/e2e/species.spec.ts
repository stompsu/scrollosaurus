import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

const drawer = (page: Page) => page.getByTestId('species-drawer');
const windowLabel = (page: Page) => page.getByTestId('timeline-window');
const filterCount = (page: Page) => page.getByTestId('filter-count');

/** Everything that makes up "the view", as the user sees it. */
async function snapshotView(page: Page) {
  return {
    // The static host (like GitHub Pages) redirects /species/x to /species/x/.
    path: new URL(page.url()).pathname.replace(/\/$/, ''),
    window: await windowLabel(page).textContent(),
    count: await filterCount(page).textContent(),
    markers: await page.locator('.tl').getAttribute('data-item-count'),
    drawerTitle: await drawer(page).getByRole('heading', { level: 2 }).textContent(),
  };
}

test('a shared URL reproduces the exact view', async ({ page, context }) => {
  await page.goto('./');
  await page.getByTestId('filters-toggle').click();
  await page.getByRole('checkbox', { name: /Carnivore/ }).check();
  await page.getByRole('checkbox', { name: 'Theropoda' }).check();
  await page.getByTestId('filters-toggle').click();
  await page.getByRole('button', { name: 'Jurassic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 201\.4 to 143\.1 /);
  await page.getByRole('button', { name: /^Allosaurus, / }).click();
  await expect(drawer(page).getByRole('heading', { level: 2 })).toHaveText('Allosaurus');
  await expect(page).toHaveURL(/\/species\/allosaurus\?diet=carnivore&group=theropoda&from=/);

  const before = await snapshotView(page);
  const shared = await context.newPage();
  await shared.goto(page.url());
  await expect(drawer(shared).getByRole('heading', { level: 2 })).toHaveText('Allosaurus');
  await expect(windowLabel(shared)).toHaveText(before.window ?? '');
  expect(await snapshotView(shared)).toEqual(before);
  await expect(shared.getByTestId('filters-toggle')).toHaveText('Filters (2)');
});

test('keyboard only: search, read, close, filter and open from the timeline', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard-only check');
  await page.goto('./');
  const search = page.getByRole('combobox', { name: 'Find a species' });
  await search.focus();
  await page.keyboard.type('stego');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const title = drawer(page).getByRole('heading', { level: 2 });
  await expect(title).toHaveText('Stegosaurus');
  await expect(page).toHaveURL(/\/species\/stegosaurus\?/);
  // The timeline moved to the species.
  await expect(windowLabel(page)).toContainText('Jurassic');

  // Focus stays inside the drawer.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await drawer(page).evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
  await expect(search).toBeFocused();

  // Filters by keyboard.
  await page.getByTestId('filters-toggle').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/diet=carnivore/);
  await expect(page.getByTestId('filters-toggle')).toHaveText('Filters (1)');

  // A marker opens the drawer with Enter; Esc returns focus to it.
  await page.getByRole('region', { name: /timeline of the mesozoic/i }).focus();
  await page.keyboard.press('Tab');
  const marker = page.locator('[data-slug]:focus');
  const slug = (await marker.getAttribute('data-slug')) ?? '';
  await page.keyboard.press('Enter');
  await expect(drawer(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-slug="${slug}"]`)).toBeFocused();
});

test('"Lived alongside" opens another species and moves the timeline to it', async ({ page }) => {
  await page.goto('species/tyrannosaurus');
  await drawer(page).getByRole('link', { name: 'Triceratops' }).click();
  await expect(drawer(page).getByRole('heading', { level: 2 })).toHaveText('Triceratops');
  await expect(page).toHaveURL(/\/species\/triceratops/);
  await expect(page.locator('[data-slug="triceratops"]')).toHaveAttribute('aria-current', 'true');
});

test('the non-dinosaur layer is off by default and can be shown from the drawer', async ({
  page,
}) => {
  await page.goto('species/mosasaurus');
  await expect(drawer(page)).toContainText('not a dinosaur');
  await expect(page.locator('[data-slug="mosasaurus"]')).toHaveCount(0);
  await drawer(page).getByRole('button', { name: 'Show animals that weren’t dinosaurs' }).click();
  await expect(page).toHaveURL(/nondino=1/);
  await expect(page.locator('[data-slug="mosasaurus"]')).toHaveAttribute('aria-current', 'true');
  await expect(drawer(page).getByRole('heading', { level: 2 })).toBeFocused();
});

test('species pages are served directly with 200 and a species title', async ({ page }) => {
  const response = await page.goto('species/sinosauropteryx/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Sinosauropteryx · Scrollosaurus');
  await expect(drawer(page)).toContainText('Chinese lizard wing');
});

test('old ?species= links redirect; unknown species are not found', async ({ page }) => {
  await page.goto('./?species=triceratops&diet=herbivore');
  await expect(page).toHaveURL(/\/species\/triceratops\?diet=herbivore/);
  await expect(drawer(page).getByRole('heading', { level: 2 })).toHaveText('Triceratops');
  await page.goto('./?species=no-such-dinosaur');
  await expect(page.getByRole('heading', { name: /lost in deep time/i })).toBeVisible();
});

test('a filter with no matches says so and can be cleared', async ({ page }) => {
  await page.goto('./?diet=insectivore&period=triassic');
  await expect(filterCount(page)).toHaveText(/^Showing 0 of /);
  await page.getByTestId('filters-toggle').click();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).not.toHaveURL(/diet=/);
  await expect(filterCount(page)).toHaveText(/^Showing (\d+) of \1 dinosaurs$/);
});

test('no axe violations with the drawer, filter panel and search list open', async ({ page }) => {
  await page.goto('species/sinosauropteryx');
  await expect(drawer(page)).toContainText('Sources');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByTestId('filters-toggle').click();
  await page.getByRole('combobox', { name: 'Find a species' }).fill('raptor');
  await expect(page.getByRole('option').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the drawer is a bottom sheet on phones and fits the width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('species/argentinosaurus');
  const box = await drawer(page).boundingBox();
  if (!box) throw new Error('drawer not rendered');
  expect(box.width).toBeLessThanOrEqual(360);
  expect(box.y).toBeGreaterThan(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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

const windowLabel = (page: import('@playwright/test').Page) => page.getByTestId('timeline-window');

test('the tour moves through five sourced steps by keyboard, and its step is in the URL', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByTestId('start-tour').click();
  const panel = page.getByTestId('story-panel');
  await expect(panel.getByRole('heading', { level: 2 })).toBeFocused();
  await expect(panel).toContainText('step 1 of 5');
  await expect(page).toHaveURL(/tour=1/);
  await expect(page.locator('[aria-current="true"][data-slug]')).toHaveAttribute(
    'data-slug',
    'eoraptor',
  );
  for (let step = 2; step <= 5; step++) {
    await panel.getByRole('button', { name: 'Next' }).press('Enter');
    await expect(panel).toContainText(`step ${String(step)} of 5`);
    await expect(page).toHaveURL(new RegExp(`tour=${String(step)}`));
    await expect(panel.getByRole('heading', { level: 2 })).toBeFocused();
    await expect(panel.getByText('Sources:')).toBeVisible();
  }
  // The last step is the asteroid: the end-Cretaceous notes show, and the view ends at 66 Ma.
  await expect(windowLabel(page)).toHaveText(/to 66 million years ago/);
  await expect(page.getByTestId('event-notes')).toContainText('Birds are living dinosaurs');
  // Back in history goes back a step.
  await page.goBack();
  await expect(panel).toContainText('step 4 of 5');
  await panel.getByRole('button', { name: 'Close tour' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page).not.toHaveURL(/tour=/);
});

test('a tour link opens on its step', async ({ page }) => {
  await page.goto('./?tour=3');
  await expect(page.getByTestId('story-panel')).toContainText('The age of giants');
  await expect(windowLabel(page)).toContainText('Late Jurassic');
});

test('light mode is remembered and passes axe', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-checked', 'true');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('species/tyrannosaurus?tour=5');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the size scene draws the species with a person, and a bus for large animals', async ({
  page,
}) => {
  await page.goto('species/tyrannosaurus');
  const scene = page.getByTestId('size-comparison');
  await expect(scene.getByRole('img', { name: /person and a school bus/ })).toBeVisible();
  await expect(scene).toContainText('generic two-legged theropod dinosaur');
  await page.goto('species/archaeopteryx');
  await expect(page.getByTestId('size-comparison')).not.toContainText('School bus');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('turns off parallax, transitions and animated zooms', async ({ page }) => {
    await page.goto('./');
    for (const layer of await page.locator('.tl-parallax > div').all()) {
      await expect(layer).toBeHidden();
    }
    // Jumps land at once instead of animating.
    await page.getByRole('button', { name: 'Jurassic' }).click();
    await expect(windowLabel(page)).toHaveText(/^Showing 201\.4 to 143\.1 /, { timeout: 500 });
    // CSS transitions and animations are cut to (almost) nothing.
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('*')].map((el) => {
        const s = getComputedStyle(el);
        return Math.max(
          parseFloat(s.transitionDuration) || 0,
          parseFloat(s.animationDuration) || 0,
        );
      }),
    );
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.001);
  });
});

test('the period tint follows the view and fades to ash at the end of the Cretaceous', async ({
  page,
}) => {
  await page.goto('./?from=160&to=150');
  const era = () =>
    page.evaluate(() => document.documentElement.style.getPropertyValue('--sc-era'));
  await expect.poll(era).toBe('var(--sc-jurassic)');
  await page.goto('./?from=67&to=66');
  await expect
    .poll(era)
    .toMatch(/color-mix\(in srgb, var\(--sc-cretaceous\) \d+%, var\(--sc-ash\)\)/);
});

test('the person fits inside the scene next to a small animal', async ({ page }) => {
  await page.goto('species/archaeopteryx');
  const svg = page.getByTestId('size-comparison').locator('svg');
  await expect(svg).toBeVisible();
  const [box, person] = await Promise.all([
    svg.boundingBox(),
    svg.locator('.sc-size-ref').first().boundingBox(),
  ]);
  if (!box || !person) throw new Error('scene not rendered');
  expect(person.x).toBeGreaterThanOrEqual(box.x);
  expect(person.x + person.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
});

test('an out-of-range tour link shows no tour and still offers it', async ({ page }) => {
  await page.goto('./?tour=99');
  await expect(page.getByTestId('story-panel')).toHaveCount(0);
  await expect(page.getByTestId('start-tour')).toBeVisible();
  await expect(page.locator('[aria-current="true"][data-slug]')).toHaveAttribute(
    'data-slug',
    'sinosauropteryx',
  );
});

test('closing the tour returns focus to its button; Back reopens the last step', async ({
  page,
}) => {
  await page.goto('./?tour=3');
  const panel = page.getByTestId('story-panel');
  await panel.getByRole('button', { name: 'Close tour' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByTestId('start-tour')).toBeFocused();
  await page.goBack();
  await expect(panel).toContainText('step 3 of 5');
});

test('Back after quick tour clicks shows that step with its own window', async ({ page }) => {
  await page.goto('./?tour=1');
  const panel = page.getByTestId('story-panel');
  await panel.getByRole('button', { name: 'Next' }).click();
  await panel.getByRole('button', { name: 'Next' }).click();
  await expect(panel).toContainText('step 3 of 5');
  await page.goBack();
  await expect(panel).toContainText('step 2 of 5');
  // Step 2 is the Triassic–Jurassic boundary.
  await expect(windowLabel(page)).toContainText('Triassic to Jurassic');
});

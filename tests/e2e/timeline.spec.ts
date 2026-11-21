import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

const region = (page: Page) => page.getByRole('region', { name: /timeline of the mesozoic/i });
const windowLabel = (page: Page) => page.getByTestId('timeline-window');

/** The visible window [older, younger] in Ma, read from the window label. */
async function visibleWindow(page: Page): Promise<[number, number]> {
  const text = (await windowLabel(page).textContent()) ?? '';
  const m = /Showing ([\d.]+) to ([\d.]+) million years ago/.exec(text);
  if (!m) throw new Error(`unexpected window label: ${text}`);
  return [Number(m[1]), Number(m[2])];
}

async function expectInsideRegion(page: Page, slugName: RegExp) {
  const box = await page.getByRole('button', { name: slugName }).boundingBox();
  const view = await region(page).boundingBox();
  if (!box || !view) throw new Error('marker or region not rendered');
  expect(box.x).toBeGreaterThanOrEqual(view.x);
  expect(box.y).toBeGreaterThanOrEqual(view.y);
  expect(box.x + box.width).toBeLessThanOrEqual(view.x + view.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(view.y + view.height + 1);
}

test('opens on Sinosauropteryx, highlighted and in view', async ({ page }) => {
  await page.goto('./');
  const marker = page.getByRole('button', { name: /^Sinosauropteryx, / });
  await expect(marker).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[aria-current="true"]')).toHaveCount(1);
  await expectInsideRegion(page, /^Sinosauropteryx, /);
  const [older, younger] = await visibleWindow(page);
  expect(older).toBeGreaterThan(125.8);
  expect(younger).toBeLessThan(124.1);
  expect(older - younger).toBeLessThan(20);
});

test('?species=tyrannosaurus highlights T. rex instead', async ({ page }) => {
  await page.goto('./?species=tyrannosaurus');
  const trex = page.getByRole('button', { name: 'Tyrannosaurus, 68 to 66 million years ago' });
  await expect(trex).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[aria-current="true"]')).toHaveCount(1);
  await expectInsideRegion(page, /^Tyrannosaurus, /);
});

test('an unknown ?species= falls back to the primary species', async ({ page }) => {
  await page.goto('./?species=no-such-dinosaur');
  await expect(page.getByRole('button', { name: /^Sinosauropteryx, / })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('jump buttons move the view to each period and back to the whole Mesozoic', async ({
  page,
}) => {
  await page.goto('./');
  const jumps = page.getByRole('group', { name: 'Jump to period' });
  await jumps.getByRole('button', { name: 'Triassic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 201\.4 million years ago/);
  await jumps.getByRole('button', { name: 'Jurassic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 201\.4 to 143\.1 million years ago/);
  await jumps.getByRole('button', { name: 'Cretaceous' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 143\.1 to 66 million years ago/);
  await jumps.getByRole('button', { name: 'Show whole Mesozoic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 66 million years ago/);
});

test('the + and − buttons zoom', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Show whole Mesozoic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 66 /);
  const zoom = page.getByRole('group', { name: 'Zoom' });
  await zoom.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(async () => spanOf(await visibleWindow(page))).toBeLessThan(130);
  const zoomedIn = spanOf(await visibleWindow(page));
  await zoom.getByRole('button', { name: 'Zoom out' }).click();
  await expect.poll(async () => spanOf(await visibleWindow(page))).toBeGreaterThan(zoomedIn);
});

const spanOf = ([older, younger]: [number, number]) => older - younger;

test('keyboard: Tab reaches a marker, Enter selects it, arrows and Home/End pan', async ({
  page,
  isMobile,
}) => {
  await page.goto('./?species=tyrannosaurus');
  await region(page).focus();
  const before = await visibleWindow(page);
  await page.keyboard.press('Home');
  await expect.poll(async () => (await visibleWindow(page))[0]).toBeGreaterThan(250);
  await page.keyboard.press('End');
  await expect.poll(async () => (await visibleWindow(page))[1]).toBeLessThan(67);
  await page.keyboard.press(isMobile ? 'ArrowUp' : 'ArrowLeft');
  await expect.poll(async () => (await visibleWindow(page))[1]).toBeGreaterThan(66.5);
  await page.keyboard.press('+');
  await expect.poll(async () => spanOf(await visibleWindow(page))).toBeLessThan(spanOf(before));

  await page.keyboard.press('Tab');
  const focused = page.locator('[data-slug]:focus');
  await expect(focused).toHaveCount(1);
  const name = (await focused.getAttribute('aria-label')) ?? '';
  const genus = name.split(',')[0] ?? '';
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(`Selected ${genus}`);
  await expect(focused).toHaveAttribute('aria-current', 'true');
});

test('Tab order follows time, oldest first', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Show whole Mesozoic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 66 /);
  await region(page).focus();
  const starts: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    starts.push(Number(await page.locator('[data-slug]:focus').getAttribute('data-start-ma')));
  }
  expect(starts).toEqual([...starts].sort((a, b) => b - a));
});

test('lays out horizontally on desktop and vertically on mobile', async ({ page, isMobile }) => {
  await page.goto('./');
  const root = page.locator('.tl');
  await expect(root).toHaveAttribute('data-orientation', isMobile ? 'vertical' : 'horizontal');
  const older = await page.getByRole('button', { name: /^Baryonyx, / }).boundingBox();
  const younger = await page.getByRole('button', { name: /^Microraptor, / }).boundingBox();
  if (!older || !younger) throw new Error('markers not rendered');
  if (isMobile) expect(younger.y).toBeGreaterThan(older.y);
  else expect(younger.x).toBeGreaterThan(older.x);
});

test('dragging pans the timeline', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse drag; touch is covered by the perf run');
  await page.goto('./');
  const [olderBefore] = await visibleWindow(page);
  const box = await region(page).boundingBox();
  if (!box) throw new Error('no region');
  const y = box.y + box.height - 20;
  await page.mouse.move(box.x + 600, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await visibleWindow(page))[0]).toBeLessThan(olderBefore);
});

test('ctrl + wheel zooms and plain wheel pans', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input');
  await page.goto('./');
  const box = await region(page).boundingBox();
  if (!box) throw new Error('no region');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await visibleWindow(page);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await visibleWindow(page))[0]).toBeLessThan(before[0]);
  const panned = await visibleWindow(page);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Control');
  await expect.poll(async () => spanOf(await visibleWindow(page))).toBeGreaterThan(spanOf(panned));
});

test('no axe violations at the default view, the whole Mesozoic and with non-default selection', async ({
  page,
}) => {
  await page.goto('./');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Show whole Mesozoic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 66 /);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('./?species=tyrannosaurus');
  await region(page).focus();
  await page.keyboard.press('Tab');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('no horizontal page scroll at 320 px; the timeline pans internally', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Show whole Mesozoic' }).click();
  await expect(windowLabel(page)).toHaveText(/^Showing 251\.9 to 66 /);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('.tl')).toHaveAttribute('data-orientation', 'vertical');
});

test('visual: default view', async ({ page, isMobile }) => {
  // Baselines are platform-specific; only the macOS one is committed.
  test.skip(isMobile || process.platform !== 'darwin' || !!process.env.CI, 'darwin desktop only');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Sinosauropteryx, / })).toBeVisible();
  await expect(region(page)).toHaveScreenshot('timeline-default.png', { animations: 'disabled' });
});

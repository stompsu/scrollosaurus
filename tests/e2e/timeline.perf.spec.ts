/**
 * Timeline frame-time measurement with the 300-item fixture. Run with `pnpm perf` only (see
 * playwright.config.ts); the default e2e run ignores this file.
 *
 * Each scenario drives continuous input for SCENARIO_MS while a requestAnimationFrame loop in the
 * page records frame-to-frame deltas. The mobile project also slows the CPU 4× through CDP.
 * Each run's results are kept in HISTORY_DIR (last RUNS_KEPT runs per project), and
 * docs/perf/phase-2.md shows the range across those runs between the perf:<project> markers.
 * Run `pnpm perf` RUNS_KEPT times to fill the table with a full range.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { format, resolveConfig } from 'prettier';

const SCENARIO_MS = 4000;
const FRAME_BUDGET_MS = 1000 / 60;
const ROOT = join(import.meta.dirname, '..', '..');
const DOC = join(ROOT, 'docs', 'perf', 'phase-2.md');
const HISTORY_DIR = join(ROOT, 'node_modules', '.cache', 'scrollosaurus-perf-history');
const RUNS_KEPT = 3;

interface PerfWindow {
  __frames?: number[];
  __recording?: boolean;
  __timelineApplyMs?: number[];
  __timelineCommits?: number;
}

interface Result {
  scenario: string;
  frames: number;
  median: number;
  p95: number;
  over: number;
  dropped: number;
  applyMedian: number;
  applyP95: number;
  commits: number;
}

const results: Result[] = [];
let browserVersion = '';

const quantile = (sorted: number[], q: number): number =>
  sorted.length === 0
    ? Number.NaN
    : (sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? Number.NaN);

async function startRecording(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as PerfWindow;
    w.__frames = [];
    w.__timelineApplyMs = [];
    w.__timelineCommits = 0;
    w.__recording = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!w.__recording) return;
      w.__frames?.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame((now) => {
      last = now;
      requestAnimationFrame(tick);
    });
  });
}

async function stopRecording(page: Page, scenario: string): Promise<void> {
  const data = await page.evaluate(() => {
    const w = window as PerfWindow;
    w.__recording = false;
    return {
      frames: w.__frames ?? [],
      apply: w.__timelineApplyMs ?? [],
      commits: w.__timelineCommits ?? 0,
    };
  });
  // Drop the first frame: it includes the time before input started.
  const frames = data.frames.slice(1).sort((a, b) => a - b);
  const apply = [...data.apply].sort((a, b) => a - b);
  expect(frames.length).toBeGreaterThan(30);
  results.push({
    scenario,
    frames: frames.length,
    median: quantile(frames, 0.5),
    p95: quantile(frames, 0.95),
    over: (100 * frames.filter((f) => f > FRAME_BUDGET_MS).length) / frames.length,
    dropped: (100 * frames.filter((f) => f > FRAME_BUDGET_MS * 1.5).length) / frames.length,
    applyMedian: quantile(apply, 0.5),
    applyP95: quantile(apply, 0.95),
    commits: data.commits,
  });
}

/** Runs `step(i)` repeatedly for SCENARIO_MS, about once per frame. */
async function forDuration(page: Page, step: (i: number) => Promise<void>): Promise<void> {
  const end = Date.now() + SCENARIO_MS;
  for (let i = 0; Date.now() < end; i++) {
    await step(i);
    await page.waitForTimeout(8);
  }
}

async function open(page: Page, view: 'Show whole Mesozoic' | 'Cretaceous' | 'Jurassic') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.tl[data-item-count="300"]')).toHaveCount(1);
  await page.getByRole('button', { name: view, exact: true }).click();
  await page.waitForTimeout(300);
  const box = await page.getByTestId('timeline-viewport').boundingBox();
  if (!box) throw new Error('no timeline');
  return box;
}

async function throttle(page: Page, isMobile: boolean): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  if (isMobile) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return cdp;
}

test.beforeAll(({ browser }) => {
  browserVersion = browser.version();
});

test('wheel or touch pan', async ({ page, isMobile }) => {
  const cdp = await throttle(page, isMobile);
  const box = await open(page, 'Cretaceous');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await startRecording(page);
  if (isMobile) {
    // One-finger drag along the (vertical) time axis, reversing every 60 moves.
    let y = cy;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y }] });
    await forDuration(page, async (i) => {
      y += Math.floor(i / 60) % 2 === 0 ? -4 : 4;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx, y }],
      });
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await stopRecording(page, 'Touch pan (one finger)');
  } else {
    await page.mouse.move(cx, cy);
    await forDuration(page, async (i) => {
      await page.mouse.wheel(0, Math.floor(i / 60) % 2 === 0 ? 40 : -40);
    });
    await stopRecording(page, 'Wheel pan');
  }
});

test('ctrl-wheel or pinch zoom', async ({ page, isMobile }) => {
  const cdp = await throttle(page, isMobile);
  const box = await open(page, 'Show whole Mesozoic');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await startRecording(page);
  if (isMobile) {
    // Two-finger pinch: spread for 40 moves, then close for 40.
    let gap = 40;
    const points = () => [
      { x: cx, y: cy - gap, id: 1 },
      { x: cx, y: cy + gap, id: 2 },
    ];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points() });
    await forDuration(page, async (i) => {
      gap += Math.floor(i / 40) % 2 === 0 ? 3 : -3;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points() });
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await stopRecording(page, 'Pinch zoom (two fingers)');
  } else {
    await page.mouse.move(cx, cy);
    await page.keyboard.down('Control');
    await forDuration(page, async (i) => {
      await page.mouse.wheel(0, Math.floor(i / 40) % 2 === 0 ? -12 : 12);
    });
    await page.keyboard.up('Control');
    await stopRecording(page, 'Ctrl + wheel zoom');
  }
});

test('mouse drag pan', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse input; touch drag is measured in "wheel or touch pan"');
  await throttle(page, isMobile);
  const box = await open(page, 'Jurassic');
  const y = box.y + box.height - 40;
  let x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await startRecording(page);
  await forDuration(page, async (i) => {
    x += Math.floor(i / 60) % 2 === 0 ? -6 : 6;
    await page.mouse.move(x, y);
  });
  await page.mouse.up();
  await stopRecording(page, 'Mouse drag pan');
});

test('keyboard pan and zoom', async ({ page, isMobile }) => {
  await throttle(page, isMobile);
  await open(page, 'Cretaceous');
  await page.getByTestId('timeline-viewport').focus();
  const [back, forward] = isMobile ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
  await startRecording(page);
  await forDuration(page, async (i) => {
    const phase = Math.floor(i / 20) % 4;
    const key = phase === 0 ? forward : phase === 1 ? '+' : phase === 2 ? back : '-';
    await page.keyboard.press(key);
  });
  await stopRecording(page, 'Keyboard arrows and +/−');
});

test.afterAll(async () => {
  const project = test.info().project.name;
  const cpu = cpus()[0]?.model ?? 'unknown CPU';
  const ram = `${Math.round(totalmem() / 2 ** 30)} GB`;
  const setup =
    project === 'mobile'
      ? 'Pixel 7 emulation (412×839, touch), CPU throttled 4× via CDP'
      : 'Desktop Chrome (1280×720)';
  // Keep this run alongside the previous ones and report the range across them.
  mkdirSync(HISTORY_DIR, { recursive: true });
  const historyFile = join(HISTORY_DIR, `${project}.json`);
  let history: Result[][] = [];
  try {
    history = JSON.parse(readFileSync(historyFile, 'utf8')) as Result[][];
  } catch {
    history = [];
  }
  history = [...history, results].slice(-RUNS_KEPT);
  writeFileSync(historyFile, JSON.stringify(history));

  const range = (values: number[], fmt: (n: number) => string): string => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return fmt(lo) === fmt(hi) ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  };
  const ms = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '–');
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const int = (n: number) => String(Math.round(n));
  const rows = results.map(({ scenario }) => {
    const runs = history.flatMap((run) => run.filter((r) => r.scenario === scenario));
    const of = (f: (r: Result) => number) => runs.map(f);
    return `| ${scenario} | ${range(
      of((r) => r.frames),
      int,
    )} | ${range(
      of((r) => r.median),
      ms,
    )} | ${range(
      of((r) => r.p95),
      ms,
    )} | ${range(
      of((r) => r.over),
      pct,
    )} | ${range(
      of((r) => r.dropped),
      pct,
    )} | ${range(
      of((r) => r.applyP95),
      ms,
    )} | ${range(
      of((r) => r.commits),
      int,
    )} |`;
  });
  const block = [
    `<!-- perf:${project}:start -->`,
    '',
    `${setup}. ${cpu}, ${ram} RAM, Chromium ${browserVersion}, headless. Range over the last ${history.length} run(s), latest ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '| Scenario | Frames | Median frame (ms) | p95 frame (ms) | Frames > 16.7 ms | Frames > 25 ms | `apply()` p95 (ms) | React commits |',
    '| --- | --: | --: | --: | --: | --: | --: | --: |',
    ...rows,
    '',
    `<!-- perf:${project}:end -->`,
  ].join('\n');
  const doc = readFileSync(DOC, 'utf8');
  const pattern = new RegExp(
    `<!-- perf:${project}:start -->[\\s\\S]*?<!-- perf:${project}:end -->`,
  );
  if (!pattern.test(doc)) throw new Error(`docs/perf/phase-2.md has no perf:${project} markers`);
  const updated = doc.replace(pattern, block);
  const options = (await resolveConfig(DOC)) ?? {};
  writeFileSync(DOC, await format(updated, { ...options, filepath: DOC }));
});

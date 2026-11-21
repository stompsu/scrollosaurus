# Phase 2 performance: timeline

Exit criterion (kickoff brief): the timeline stays smooth at 60 fps with the seed data duplicated to 300 items.

## How the timeline keeps frames cheap

- d3-zoom owns the transform. Input events only update it and request one `requestAnimationFrame`.
- Each frame, `TimelineEngine.apply()` (`src/features/timeline/engine.ts`) writes CSS transforms straight to the DOM. A pan frame writes one transform per layer (three layers); only a frame where the zoom factor changed rewrites each rendered marker (position and bar length) and band.
- React re-renders ("commits") only when the half-octave zoom level changes, when the view has drifted half a viewport (time or lanes) since the last render, or 150 ms after the view comes to rest. During an animated jump or +/− button zoom, zoom-level commits wait for the end of the animation. Lane packing runs on those commits, never per frame.
- Markers are virtualised on both axes: only markers whose range overlaps the visible window ± one viewport, and whose lane is within the visible lanes ± one viewport, are in the DOM. Markers are memoised, so a commit re-renders only the ones whose lane, highlight or tab stop changed.

## Method

- **Fixture.** `pnpm perf` builds the app with `VITE_PERF_FIXTURE=1` into `node_modules/.cache/scrollosaurus-perf` (never into `dist/`). In that build only, `usePerfFixture` loads `src/features/timeline/perf-fixture.ts` through a dynamic import: the 29 seed dinosaurs repeated to 300 items with unique slugs and offsets of up to ±1.5 Ma (kept inside the Mesozoic). These are not real ranges. The normal `pnpm build` output contains no fixture code (checked by grepping `dist/assets` for the fixture module, its slugs and the instrumentation globals: no matches).
- **Server.** The build is served by `scripts/serve-pages.ts` on port 4174 (`DIST_DIR` points it at the perf build).
- **Spec.** `tests/e2e/timeline.perf.spec.ts`, run only when `PERF=1` (the default `pnpm test:e2e` ignores `*.perf.spec.ts`). One test at a time, prefers-reduced-motion on so the jump buttons that set up each scenario don't animate.
- **Scenarios**, each about 4 s of continuous input sent from Playwright roughly once per frame:
  - Desktop: plain-wheel pan (Cretaceous view), Ctrl + wheel zoom in and out (from the whole Mesozoic, where all 300 markers are in the time window), mouse drag pan (Jurassic view), keyboard arrows and +/− alternating.
  - Mobile: one-finger touch pan, two-finger pinch zoom (both sent as CDP `Input.dispatchTouchEvent`), keyboard arrows and +/−.
- **Measurement.** A `requestAnimationFrame` loop in the page records frame-to-frame deltas during the scenario. The perf build also records how long each `apply()` takes and how many React commits happen. We report the median and p95 frame delta, the share of frames over 16.7 ms, and the share over 25 ms (a frame that missed a vsync).
- **Mobile.** Playwright's Pixel 7 device (412×839, touch, coarse pointer, vertical layout) with CDP `Emulation.setCPUThrottlingRate` at 4×.
- **Machine.** `sysctl -n machdep.cpu.brand_string`: Apple M1, 8 GB RAM, macOS 27.0. Chromium is the Playwright build, headless.

Reading the "> 16.7 ms" column: headless Chromium's rAF timestamps alternate between about 16.6 and 16.8 ms at 60 Hz even on an idle page (an idle check gave 240 frames, all between 16.5 and 16.8 ms, 38% of them above 16.7 ms). So about 60% of frames land just above 16.7 ms without any dropped frame, and this column is dominated by timer jitter. A dropped frame shows up as a delta of about 33 ms, so "> 25 ms" is the column that measures jank.

## Results

Each cell is the range across the last three `pnpm perf` runs (min–max, or one value when all runs agree). Every run stores its results under `node_modules/.cache/scrollosaurus-perf-history/` and rewrites the two tables below from the last three runs. Ranges understate real variance: the QA audit measured mobile pinch zoom at 2.5% of frames over 25 ms in its own run, higher than any of these three.

### Desktop

<!-- perf:desktop:start -->

Desktop Chrome (1280×720). Apple M1, 8 GB RAM, Chromium 159.0.8154.6, headless. Range over the last 3 run(s), latest 2026-11-21.

| Scenario                |  Frames | Median frame (ms) | p95 frame (ms) | Frames > 16.7 ms | Frames > 25 ms | `apply()` p95 (ms) | React commits |
| ----------------------- | ------: | ----------------: | -------------: | ---------------: | -------------: | -----------------: | ------------: |
| Wheel pan               | 240–241 |              16.7 |           16.7 |      62.1%–64.3% |           0.0% |                0.1 |             2 |
| Ctrl + wheel zoom       | 240–242 |              16.7 |      16.7–16.8 |      60.7%–63.6% |           0.0% |            0.2–0.3 |         18–23 |
| Mouse drag pan          | 238–240 |              16.7 |           16.7 |      62.6%–63.3% |           0.0% |                0.1 |             0 |
| Keyboard arrows and +/− | 237–239 |              16.7 |      16.7–16.8 |      60.3%–63.2% |      0.0%–0.4% |                0.2 |         87–89 |

<!-- perf:desktop:end -->

### Mobile emulation, CPU 4× slower

<!-- perf:mobile:start -->

Pixel 7 emulation (412×839, touch), CPU throttled 4× via CDP. Apple M1, 8 GB RAM, Chromium 159.0.8154.6, headless. Range over the last 3 run(s), latest 2026-11-21.

| Scenario                 |  Frames | Median frame (ms) | p95 frame (ms) | Frames > 16.7 ms | Frames > 25 ms | `apply()` p95 (ms) | React commits |
| ------------------------ | ------: | ----------------: | -------------: | ---------------: | -------------: | -----------------: | ------------: |
| Touch pan (one finger)   | 241–243 |              16.7 |      16.7–16.8 |      60.1%–63.9% |           0.0% |            0.1–0.5 |             0 |
| Pinch zoom (two fingers) | 240–244 |              16.7 |      16.7–16.8 |      60.7%–63.5% |      0.0%–0.8% |            0.9–1.0 |          9–10 |
| Keyboard arrows and +/−  | 214–222 |              16.7 |           33.3 |      64.4%–65.9% |     6.8%–10.7% |            0.8–0.9 |         72–74 |

<!-- perf:mobile:end -->

## Verdict

- **Desktop:** 60 fps met. Medians are 16.7 ms and p95 is at most 16.8 ms in every scenario and every run; at most 0.4% of frames miss a vsync (keyboard). `apply()` p95 is at most 0.3 ms.
- **Mobile, 4× CPU throttling, touch pan and pinch zoom:** 60 fps met in these runs (median 16.7 ms, p95 at most 16.8 ms, 0–0.8% of frames over 25 ms), with the caveat that QA saw 2.5% for pinch zoom in one run.
- **Mobile, 4× CPU throttling, rapid keyboard zoom: 60 fps not met.** p95 is 33.3 ms and 6.8–10.7% of frames are over 25 ms across runs (about 8–11% in earlier runs too). The scenario presses a key every 10–20 ms and almost every +/− press crosses a zoom level, so React re-renders and re-packs lanes about 70 times in 4 s; with the CPU slowed 4×, some of those commits take longer than a frame. Panning with the arrow keys alone does not commit on each press.

## What was tried

1. First version: virtualised along time only. On the whole-Mesozoic view all 300 markers were in the DOM, and every zoom frame recalculated style for about 650 elements. Mobile pinch zoom ran at a median of 33 ms per frame (p95 100 ms, 75% of frames over 25 ms) and keyboard zoom at p95 117 ms. A Chrome trace showed style recalculation (`UpdateLayoutTree`) as the main cost, not our JavaScript (`apply()` median 1 ms). Disabling every stylesheet didn't change the recalculation cost, so it was element count, not selectors.
2. Added virtualisation across lanes (render only lanes in view ± one viewport). Pinch zoom dropped to under 1% of frames over 25 ms.
3. Memoised markers and replaced a forced layout read (band label widths) with canvas text measurement. Keyboard zoom at 4× went from 12.8% to roughly 7–11% of frames over 25 ms (it varies between runs); the remaining cost is React commits and style for newly mounted markers.

## Known limitations

- Headless Chromium on an M1 laptop with CPU throttling is a stand-in for a mid-range phone, not a real one. GPU, compositor and touch latency on a real device are not measured. Worth repeating on real hardware in Phase 7.
- Input is synthetic: Playwright and CDP events, sent about once per frame. Real trackpads send wheel events at a higher rate, which d3-zoom coalesces into one frame anyway.
- Frame deltas include the cost of the input dispatch from Playwright, which slightly penalises the keyboard and wheel scenarios.
- Rapid keyboard zooming on a slow CPU still drops frames; a possible fix is to defer the lane re-pack until key repeat stops.
- Numbers vary between runs and machines: by up to a few percent of frames for pinch (0–0.8% here, 2.5% in the QA run) and by several percentage points for the keyboard scenario on mobile.

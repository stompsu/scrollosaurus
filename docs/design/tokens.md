# Design tokens

Owned by `ui-designer`. Tokens are CSS custom properties on `:root` in `src/styles/index.css` with an `--sc-` prefix, mapped to Tailwind names through `@theme inline` (e.g. `bg-surface`, `text-accent`, `font-display`). Distinct names avoid a self-referencing variable in Tailwind's theme layer.

Dark "deep time" is the default. `data-theme="light"` on `<html>` switches to the light theme; the header's switch stores the choice in `localStorage` (`scrollosaurus:theme`), and `public/theme-init.js` applies it before the first paint (an external file, because the CSP forbids inline scripts).

## Colour

All text pairs are at least WCAG AA (4.5:1); icons and UI borders that carry meaning are at least 3:1. Ratios are against the theme's `--sc-bg` / `--sc-surface`.

| Token                   | Dark      | Light     | Use                                        | Light contrast (bg / surface) |
| ----------------------- | --------- | --------- | ------------------------------------------ | ----------------------------- |
| `--sc-bg`               | `#12100e` | `#f4efe4` | Page background                            |                               |
| `--sc-surface`          | `#1d1a17` | `#fffbf3` | Cards, panels                              |                               |
| `--sc-surface-2`        | `#2a2622` | `#ebe2d2` | Raised areas, image placeholders           |                               |
| `--sc-border`           | `#4a433c` | `#c9bba6` | Decorative borders (never the only cue)    |                               |
| `--sc-text`             | `#f3ede4` | `#1f1a14` | Body text                                  | 15.1 / 16.7                   |
| `--sc-text-muted`       | `#b9afa2` | `#5e5347` | Secondary text, credits                    | 6.5 / 7.3                     |
| `--sc-accent`           | `#e0a458` | `#94450c` | Links, active nav, range bars              | 5.9 / 6.5                     |
| `--sc-focus`            | `#ffd27a` | `#1f5fbf` | Focus outline (3 px)                       | 5.3 / 5.9                     |
| `--sc-diet-carnivore`   | `#f08a7a` | `#b23a28` | Diet badge border and icon (with text)     | 5.2 / 5.8                     |
| `--sc-diet-herbivore`   | `#8fd18b` | `#2c6e2f` |                                            | 5.4 / 6.0                     |
| `--sc-diet-omnivore`    | `#e5c26b` | `#7a5c00` |                                            | 5.5 / 6.1                     |
| `--sc-diet-piscivore`   | `#7ec3e8` | `#1c6593` |                                            | 5.5 / 6.1                     |
| `--sc-diet-insectivore` | `#c9a0e8` | `#6d45a3` |                                            | 6.0 / 6.7                     |
| `--sc-diet-uncertain`   | `#b9afa2` | `#5e5347` |                                            | 6.5 / 7.3                     |
| `--sc-on-band`          | `#fdf8f0` | same      | Text on period bands                       |                               |
| `--sc-ash`              | `#8a8680` | same      | End-Cretaceous ash; the K–Pg notes' border |                               |

Dark-theme diet colours are 7.1–10.1:1 on `--sc-surface`.

### Period bands and the period tint

| Token             | Value     | Direction from the brief    | Contrast with `--sc-on-band` |
| ----------------- | --------- | --------------------------- | ---------------------------- |
| `--sc-triassic`   | `#8c3f1c` | Arid ochre / red            | 6.99:1 (AA)                  |
| `--sc-jurassic`   | `#1e5b4f` | Fern green / teal           | 7.45:1 (AAA)                 |
| `--sc-cretaceous` | `#7d3a53` | Warm floral (ash near K–Pg) | 7.63:1 (AAA)                 |

The bands keep the same fills in both themes. Epoch and stage bands are darker shades of their period (`color-mix(in srgb, var(--sc-<period>) N%, #000)`: epochs 82%, stages 70% and 58% alternating), which only raises contrast with `--sc-on-band` (8.9–12.8:1). These derived values live in `src/features/timeline/timeline.css`.

`--sc-era` is set on `<html>` by the timeline page whenever the view settles (`src/lib/era-theme.ts`): the period at the middle of the view, mixed towards `--sc-ash` across the last stage of the Cretaceous (read from `data/geologic-time.json`, so the Maastrichtian today). It tints the top of the page (10%) and the timeline background (7%); text never sits on the tint alone, so contrast is unaffected. Other pages clear it.

## Typography

| Token               | Value                                 | Use      |
| ------------------- | ------------------------------------- | -------- |
| `--sc-font-display` | Fraunces (variable, optical sizes)    | Headings |
| `--sc-font-body`    | Atkinson Hyperlegible Next (variable) | Body, UI |

Both are SIL Open Font License fonts from the `@fontsource-variable/*` packages, bundled and served from the site (no font CDN requests). The Latin subsets are preloaded in the built `index.html` (`preloadFonts` in `vite.config.ts`), so text doesn't shift when the fonts swap in. System fonts are the fallback.

## Background art

`src/features/timeline/assets/` holds two original tiling SVGs (sediment strata, and fern/cycad/conifer silhouettes) used as CSS masks over `--sc-text`, at 5–7% opacity, so they follow the theme. The timeline engine moves them at 25% and 55% of the pan speed. They are hidden under reduced motion; the vertical (phone) layout shows only the strata.

Size silhouettes (`src/features/species/silhouettes.ts`) are original, generic shapes per body plan, labelled as such in the UI.

## Motion

- Under `prefers-reduced-motion: reduce`, every CSS transition and animation collapses to ~0, the parallax layers are hidden, page cross-fades are off, and timeline zooms jump instead of animating.
- Page changes cross-fade for 180 ms through React's `<ViewTransition>` (`src/app/Layout.tsx`), keyed by page so opening a species panel doesn't trigger it.
- The species drawer slides in 2 rem over 220 ms (CSS `@starting-style`).
- No animation library: CSS and the View Transitions API cover everything, so Motion stays out of the bundle (ADR-0001 §2).

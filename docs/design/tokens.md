# Design tokens

> Phase 0 placeholders. `ui-designer` owns this file and refines the palette, typography and light mode in Phase 5.

Tokens are CSS custom properties on `:root` in `src/styles/index.css` with an `--sc-` prefix, mapped to Tailwind names through `@theme inline` (e.g. `bg-surface`, `text-accent`, `font-display`). Distinct names avoid a self-referencing variable in Tailwind's theme layer. Dark "deep time" is the default.

## Colour

| Token             | Value     | Use                  |
| ----------------- | --------- | -------------------- |
| `--sc-bg`         | `#12100e` | Page background      |
| `--sc-surface`    | `#1d1a17` | Cards, panels        |
| `--sc-text`       | `#f3ede4` | Body text            |
| `--sc-text-muted` | `#b9afa2` | Secondary text       |
| `--sc-accent`     | `#e0a458` | Links, active nav    |
| `--sc-focus`      | `#ffd27a` | Focus outline (3 px) |
| `--sc-on-band`    | `#fdf8f0` | Text on period bands |

### Period bands

| Token             | Value     | Direction from the brief    | Contrast with `--sc-on-band` |
| ----------------- | --------- | --------------------------- | ---------------------------- |
| `--sc-triassic`   | `#8c3f1c` | Arid ochre / red            | 6.99:1 (AA)                  |
| `--sc-jurassic`   | `#1e5b4f` | Fern green / teal           | 7.45:1 (AAA)                 |
| `--sc-cretaceous` | `#7d3a53` | Warm floral (ash near K–Pg) | 7.63:1 (AAA)                 |

Timeline epoch and stage bands (Phase 2) use darker shades of their period, mixed with black in CSS (`color-mix(in srgb, var(--sc-<period>) N%, #000)`): epochs 82%, stages 70% and 58% alternating. Darkening only raises contrast with `--sc-on-band` (8.9–12.8:1). The era band mixes 12% `--sc-text` into `--sc-bg` (12.1:1 with `--sc-text`). These are derived values, not new tokens; they live in `src/features/timeline/timeline.css`.

Text contrast is checked by axe in the Playwright suite.

## Typography

| Token            | Value (placeholder) | Use      |
| ---------------- | ------------------- | -------- |
| `--font-display` | System serif stack  | Headings |
| `--font-body`    | System sans stack   | Body, UI |

A characterful display face and a readable body face will be chosen in Phase 5 and **self-hosted** (no Google Fonts requests, per the privacy constraint).

## Motion

All animation and transition durations collapse under `prefers-reduced-motion: reduce`.

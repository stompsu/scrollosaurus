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

Text contrast is checked by axe in the Playwright suite.

## Typography

| Token            | Value (placeholder) | Use      |
| ---------------- | ------------------- | -------- |
| `--font-display` | System serif stack  | Headings |
| `--font-body`    | System sans stack   | Body, UI |

A characterful display face and a readable body face will be chosen in Phase 5 and **self-hosted** (no Google Fonts requests, per the privacy constraint).

## Motion

All animation and transition durations collapse under `prefers-reduced-motion: reduce`.

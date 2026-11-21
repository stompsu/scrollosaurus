# ADR-0001: Architecture — static single-page app, no backend

- **Status:** Accepted (2026-11-20). Hosting: GitHub Pages.
- **Date:** 2026-11-20
- **Deciders:** project owner, Claude (lead engineer)

## Context

Scrollosaurus shows ~100–300 Mesozoic species on an interactive, zoomable timeline with filters, search, deep links and EN/PL text. The content is small (≈1 MB JSON before images), changes rarely, and is curated by hand with sources. There are no accounts, no user-generated content and no tracking. The core of the product is one large, highly interactive surface (the timeline) that must stay at 60 fps.

## Decision

### 1. Static site, no custom backend

The app is a fully static build. All content lives as versioned JSON in `data/` and is validated at build time. Node/TypeScript scripts in `scripts/` do the work a backend would otherwise do:

1. `validate:data` — Zod-validate every data file; fail the build on any error, missing source or missing image credit.
2. `fetch-images` — read Commons file IDs from species data, fetch author/licence/URL from the Wikimedia Commons API, download originals.
3. `optimize-images` — sharp → AVIF + WebP at 320/640/1280 px, blur placeholders, `srcset` metadata.
4. `build-index` — build the MiniSearch index and `species.min.json` bundles split by period.

Search, filtering and sorting run in the browser. Images are self-hosted in the static output so they can't disappear upstream.

**Revisit when:** user-generated content is added, or the dataset grows to thousands of species. Neither is planned.

### 2. Frontend stack

| Concern            | Choice                                                                                                        | Reason                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Build / dev        | Vite + React + TypeScript (strict)                                                                            | Fast SPA tooling; the timeline is one big interactive island, so SSR/islands add little. |
| Styling            | Tailwind CSS + CSS variables                                                                                  | Fast iteration; per-period themes via variables.                                         |
| UI animation       | Motion (not installed yet: the Phase 3 drawer uses a CSS transition; revisit in Phase 5)                      | Declarative UI transitions. Not used for timeline pan/zoom.                              |
| Timeline maths     | `d3-scale`, `d3-zoom`, plus `d3-selection` (d3-zoom's own dependency, used to attach it; approved in Phase 2) | Proven Ma → px mapping and zoom/pan transforms without the whole of D3.                  |
| Timeline rendering | DOM + SVG; Canvas only if profiling shows need (> ~500 visible items)                                         | Accessibility, styling, focusable markers.                                               |
| Timeline updates   | `requestAnimationFrame` + CSS/SVG transforms; no React render per frame                                       | 60 fps target.                                                                           |
| Virtualisation     | Render markers in viewport ± buffer                                                                           | Keeps the DOM small as data grows.                                                       |
| State              | URL is the source of truth (see §7); React state for the rest. Zustand only once shared UI state needs it     | Shareable links; no store was needed in Phase 3.                                         |
| Search             | MiniSearch, index built in the browser from the species index (move to build time if the data grows)          | Fuzzy, small, runs offline.                                                              |
| Routing            | React Router: `/`, `/species/:slug`, `/about`, `/credits`                                                     | Deep links to species.                                                                   |
| i18n               | i18next / react-i18next (EN, PL)                                                                              | Mature; scientific names never translated.                                               |
| Data validation    | Zod (shared between scripts and app)                                                                          | Bad data fails the build.                                                                |
| Images             | sharp build-time pipeline                                                                                     | AVIF/WebP, responsive, blur placeholders.                                                |
| Testing            | Vitest + Testing Library; Playwright; axe-core                                                                | Unit, E2E/visual, accessibility.                                                         |
| Lint / format      | ESLint flat config + Prettier                                                                                 | Standard.                                                                                |
| Package manager    | pnpm                                                                                                          | Fast, strict dependency resolution.                                                      |
| Hosting            | **GitHub Pages**, deployed by GitHub Actions (`actions/deploy-pages`)                                         | Free, no external account; see §6.                                                       |

All dependency versions are the latest stable at setup time, checked against the registry rather than assumed. Exception: **TypeScript is pinned to 6.0.x** because typescript-eslint 8.x supports `typescript <6.1.0`, so TypeScript 7 would break type-aware linting. Revisit when typescript-eslint supports TS 7.

Versions at setup (2026-11-20): Vite 8.3, React 19.3, React Router 8.5, TypeScript 6.0.3, Tailwind 4.3, ESLint 10.15, typescript-eslint 8.73, Vitest 5.1, Playwright 1.65, Zod 4.6, pnpm 12.21, Node 26.

Phase 0 companion dev dependencies (approved with the Phase 0 plan): `@vitejs/plugin-react`, `@tailwindcss/vite`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `@testing-library/jest-dom`, `jsdom`, `@axe-core/playwright`, `tsx`, `@types/*`. Feature boundaries use ESLint's built-in `no-restricted-imports` rather than a plugin.

### 3. Repository structure

Feature folders under `src/features/{timeline,species,filters}`, shared primitives in `src/components/ui`, schemas/loaders/utils in `src/lib`, app shell and routes in `src/app`. Features don't import each other's internals. See `docs/kickoff-prompt.md` §2 for the full tree.

### 4. Data loading

- Geologic time (`data/geologic-time.json`, with ICS chart version recorded) and a lightweight species index load up front.
- The species index is **generated at build time** by a Vite plugin (`speciesIndexPlugin` in `vite.config.ts`) as the virtual module `virtual:species-index`, so dev, build, tests and typecheck all see the same index without a generated file or pre-step. Per species it holds only what the timeline, filters and search need: slug, name, group and its ancestors, `isDinosaur`, diet, time range, periods, continents, `famous` (size class and thumbnails are added in Phases 3–4). The search index will be built the same way. (Decided in Phase 1 after the schema review; implemented in Phase 2. This replaces the earlier plan of a `scripts/build-data.ts` writing to `src/generated/`.)
- Full species records are **not** bundled eagerly: a non-eager `import.meta.glob('/data/species/*.json')` gives each record its own chunk, fetched when its detail view opens. An eager glob of 100+ records would spend most of the JS budget on JSON.
- Size class is derived at build time from `size.lengthM` only (mass is missing or disputed for too many species) and added to the species index; it is never stored per species, because it would be an unsourced fact. The classes are display buckets approved by the owner in Phase 3 and live in `src/lib/size-class.ts`: small < 2 m, medium 2–6 m, large 6–12 m, giant ≥ 12 m. A species counts in every class its length range touches; no length means "size unknown". (Supersedes the earlier mass-first plan with thresholds in `data/site.json`.)
- The browser never runs Zod: data is validated by `pnpm validate:data` before every build.
- Images load lazily with placeholders.
- Initial JS budget: ≤ 200 KB gzipped.

### 5. Privacy

No cookies, no accounts, no tracking analytics. Optional `localStorage` for theme, language and last filters only. Fonts are self-hosted (no third-party font CDNs) so page loads make no requests to other hosts.

### 6. Hosting: GitHub Pages

- Deployed from `main` by `.github/workflows/deploy.yml` using `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Served at `https://stompsu.github.io/scrollosaurus/`, so Vite's `base` is `/scrollosaurus/` (override with `BASE_PATH`, e.g. `/` for a custom domain). The router reads its basename from `import.meta.env.BASE_URL`.
- **Deep links return 200, without the `404.html` workaround:** every route is known at build time, so `scripts/emit-route-html.ts` writes `dist/<route>/index.html` for each static route (and, from Phase 3, each species). `404.html` is a copy of the app that renders the not-found page. The same files will carry per-species meta/Open Graph tags in Phase 7.
- No custom response headers: the CSP is a `<meta>` tag added to production builds by a small Vite plugin (`vite.config.ts`; strict `'self'` policy, no inline scripts or styles). Caching is Pages' default, which is fine because Vite emits hashed asset names.
- E2E tests run against `scripts/serve-pages.ts`, a tiny static server that behaves like Pages (no SPA fallback, `404.html` with status 404), so a missing per-route file fails the tests.
- Deploys run only after the CI workflow succeeds on `main` (`workflow_run`), building the exact commit CI tested.
- No per-PR preview deployments. If needed later (e.g. Phase 6 content review), add a preview host alongside Pages; the output is plain static files.

### 7. Shareable view state (Phase 3)

- The selected species is in the path, `/species/:slug`; filters and the visible time window are in the query string, e.g. `/species/allosaurus?diet=carnivore&group=theropoda&from=201.4&to=143.1`. Opening that link restores the same view. `src/lib/view-state.ts` parses and writes it; unknown values are dropped, and lists are written in a fixed order so equal views have equal URLs.
- The timeline reports its window only when the view settles, and the page writes it with `replace`, so panning doesn't fill the history. Opening and closing a species pushes history entries, so Back closes the drawer.
- `/` and `/species/:slug` render one page component that stays mounted, so the timeline keeps its place when the drawer opens and closes. Old `/?species=x` links redirect to `/species/x`.
- The drawer is a native modal `<dialog>`: focus stays inside, Esc closes it, and focus returns to what opened it.

## Rejected alternatives

| Alternative                            | Why rejected                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js**                            | SSR/server components unnecessary for static, rarely-changing content; heavier runtime and hosting assumptions.                                                                                                    |
| **Astro**                              | Strong for content sites, but the product is dominated by one large interactive component; islands add complexity for little gain. Reasonable to revisit if we need pre-rendered species pages for SEO in Phase 7. |
| **vis-timeline / TimelineJS**          | Not flexible enough for semantic zoom levels, lane packing and custom cards.                                                                                                                                       |
| **Full D3**                            | Only scale and zoom modules are needed; full bundle is unnecessary weight.                                                                                                                                         |
| **Canvas/WebGL timeline from day one** | Harder accessibility and styling; adopt only if profiling demands it.                                                                                                                                              |
| **Headless CMS / custom API**          | Adds a backend, auth and cost for content that changes rarely and must be reviewed in git anyway.                                                                                                                  |
| **Hotlinking Commons images**          | Files can be renamed or deleted upstream; no control over size/format.                                                                                                                                             |
| **Azure Static Web Apps**              | Gives PR preview environments and custom headers, but needs an Azure subscription and deployment token; SPA routing is solved on Pages with per-route HTML. Revisit if PR previews become important.               |
| **GitHub Pages `404.html` SPA hack**   | Deep links would return HTTP 404, hurting indexing and link previews; per-route HTML avoids it.                                                                                                                    |
| **TypeScript 7**                       | Not yet supported by typescript-eslint (peer range `<6.1.0`); pinned to 6.0.x for now.                                                                                                                             |

## Consequences

- **+** Free, simple hosting; nothing to operate or secure server-side; every content change is reviewed in a PR.
- **+** Data quality is enforced mechanically (Zod + credit checks in CI).
- **−** Content updates require a rebuild and deploy (acceptable at this scale).
- **−** Social previews per species need pre-rendering or static OG pages later (Phase 7).
- **−** Image pipeline adds build time; cache optimised outputs in CI.

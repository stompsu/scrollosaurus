# Scrollosaurus

A static, read-only web app that shows dinosaurs on a scrollable, zoomable, interactive timeline across the Mesozoic (Triassic, Jurassic, Cretaceous, ~252–66 Ma). Each species has an image, key facts, a classification and sources. Users filter by diet, group, period, size and continent, and search by name. English and Polish.

Full brief: `docs/kickoff-prompt.md`. Architecture: `docs/decisions/0001-architecture.md`.

## Hard constraints

- **No accounts, no sign-in, no user data.** No cookies beyond what the static host needs. No analytics that track people. UI preferences (theme, language, last filters) go in `localStorage` only, and that is optional.
- **No custom backend.** Static site only. All content is versioned data files in `data/`, validated at build time. Build-time scripts in `scripts/` replace a backend.
- **Scientific honesty.** Never invent facts, dates, sizes or images. Every species record has sources. Uncertain or disputed values are marked as such, never guessed. If a fact can't be verified, leave the field empty, mark it `uncertain`, and list it in the phase report.
- **Licensing.** Images only under Public Domain, CC0, CC BY or CC BY-SA, mainly from Wikimedia Commons. Store author, licence, licence URL and source URL for every image, and show the credit in the UI.
- Geological time boundaries come from the latest ICS International Chronostratigraphic Chart, recorded in `data/geologic-time.json`. Never hard-code dates in components.

> **Rule: all facts in `data/` need sources; all images need credits; the build fails otherwise.**

## Commands

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Vite dev server                                      |
| `pnpm build`         | Production build (runs data validation first)        |
| `pnpm preview`       | Serve the production build locally                   |
| `pnpm test`          | Vitest unit tests                                    |
| `pnpm test:e2e`      | Playwright end-to-end, visual and axe checks         |
| `pnpm lint`          | ESLint (flat config) + Prettier check                |
| `pnpm typecheck`     | `tsc --noEmit`                                       |
| `pnpm validate:data` | Zod validation of everything in `data/`              |
| `pnpm images`        | Fetch Commons metadata, download and optimise images |

## Stack

Vite + React + TypeScript (strict), Tailwind CSS + CSS variables, Motion (UI only), d3-scale + d3-zoom (timeline maths), Zustand (UI state), URL query string (filter state), MiniSearch, React Router, i18next, Zod, sharp, Vitest + Testing Library, Playwright + axe-core, ESLint + Prettier, pnpm. Hosting: static, deployed by GitHub Actions.

**Ask before adding any dependency not listed here** (consult `frontend-architect`).

## Conventions

- TypeScript `strict`; no `any` without a comment justifying it.
- Feature folders: `src/features/{timeline,species,filters}`. Features don't import each other's internals; share via `src/lib` or `src/components/ui`.
- Named exports only. Default exports only for route components.
- Timeline pan/zoom never re-renders React per frame: use `requestAnimationFrame` and CSS/SVG transforms.
- Diet/group badges always pair icon + text, never colour alone. WCAG AA contrast.
- Respect `prefers-reduced-motion` everywhere.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`…). Small commits.
- One branch per phase (`phase-N/<name>`), merged to `main` after review.
- Keep `docs/` current; update or supersede ADRs when a decision changes.
- TypeScript is pinned to 6.0.x until typescript-eslint supports TS 7 (see ADR-0001).
- The app is served under `/scrollosaurus/` on GitHub Pages: use router links and `import.meta.env.BASE_URL`, never root-absolute URLs. New static routes go in `src/app/static-paths.ts`.

## Product decisions

- **Primary species: _Sinosauropteryx_.** When the page loads with no selection in the URL, it is the first highlighted dinosaur. Its slug lives in config/data, not in components.

## Subagents (`.claude/agents/`)

- `paleo-content-curator` — research, write and fact-check species data, geologic time, EN/PL descriptions.
- `media-curator` — find and licence-check Commons images, image pipeline, credits page.
- `frontend-architect` — architecture, ADRs, structure, data loading, build config, dependency gate.
- `timeline-engineer` — everything in `src/features/timeline` (scale, zoom, bands, markers, virtualisation, input, perf).
- `ui-designer` — tokens, era themes, typography, badges, cards, drawer, silhouettes, layout.
- `qa-a11y-perf` — tests, accessibility and performance audits; run after each phase / before merge.
- `code-reviewer` — read-only review of the phase diff; findings ranked Blocker / Should-fix / Nit.

## Definition of done (per task)

1. `pnpm typecheck`, `pnpm lint` and `pnpm test` green.
2. `pnpm validate:data` green.
3. No accessibility regressions (axe checks pass).
4. The `code-reviewer` agent has run on the phase diff and blockers are fixed.

## Working rules

- Plan before coding: propose each phase's task list and wait for approval.
- At the end of each phase: run `qa-a11y-perf` and `code-reviewer`, fix blockers, commit, summarise, and stop for review.

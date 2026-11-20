# Scrollosaurus: Claude Code Kickoff Prompt

> Paste everything below the line into Claude Code at the root of an empty `scrollosaurus` repo.
> Start in **plan mode** (Shift+Tab twice) so Claude proposes the plan before it writes files.

---

## 0. Mission

You are the lead engineer on **Scrollosaurus**, a static, read-only web app that shows dinosaurs on a **dynamic, scrollable, zoomable, interactive timeline** across the Mesozoic (Triassic, Jurassic, Cretaceous). Each species has a photo or illustration, key facts and a classification. Users can filter by diet (predators, plant-eaters and others) and by group.

**Hard constraints**
- No user accounts, no sign-in, no user data, no cookies beyond what the static host needs, no analytics that track people. Remember UI preferences (theme, language, last filters) in `localStorage` only, and make that optional.
- **No custom backend.** The app is a static site. All content is versioned data files in the repo, validated at build time.
- **Scientific honesty.** Never invent facts, dates, sizes or images. Every species record has sources. If something is uncertain or disputed, mark it so; don't guess.
- **Licensing.** Use only images with a clear free licence (public domain, CC0, CC BY, CC BY-SA), mainly from Wikimedia Commons. Store author, licence and source URL for every image and show the credit in the UI.

Before you write code, read this whole prompt, then create `CLAUDE.md`, the subagents in section 4 and `docs/decisions/0001-architecture.md`. Then show me the Phase 0 plan and wait for my approval.

---

## 1. Product scope

### Core experience
1. **Timeline canvas.** A horizontal timeline on desktop and a vertical one on mobile, running from about 252 to 66 million years ago (Ma). It shows coloured bands for eras, periods and epochs. Each species appears as a range bar or marker placed by its **first and last appearance** in the fossil record.
2. **Scroll and zoom.** Wheel or trackpad scrolling, drag-to-pan, pinch zoom and keyboard controls (arrow keys, +/-, Home/End). It has semantic zoom levels:
   - Era view: only the periods and the headline species.
   - Period view: epochs and all species.
   - Close view: stages (ages), full cards and labels.
3. **Species cards.** A thumbnail, the name with its meaning ("Tyrannosaurus = tyrant lizard king"), a diet badge, the group, the time range and the size.
4. **Detail panel or drawer** with:
   - a hero image and its credit
   - facts: length, weight, diet, group, where it lived, the formations it was found in, who described it and when
   - a size comparison silhouette next to an adult human (1.8 m) and a school bus
   - "Lived alongside": species whose time ranges overlap
   - fun facts and sources
5. **Filters and search**
   - Diet: carnivore (predator), herbivore, omnivore, piscivore (fish-eater), insectivore, uncertain.
   - Group: Theropoda, Sauropodomorpha, Ornithischia, with subgroups such as Ceratopsia, Ankylosauria, Stegosauria, Ornithopoda, Pachycephalosauria and Hadrosauridae.
   - Period, size class, continent, and "famous only".
   - Fuzzy name search that runs entirely in the browser.
   - All filter state lives in the URL, so every view can be shared as a link.
6. **"Not a dinosaur" layer.** Pterosaurs, plesiosaurs, ichthyosaurs and mosasaurs are a separate toggleable layer, **off by default**, clearly labelled "not a dinosaur". This deals with the most common misconception.
7. **Birds.** A short note at the K–Pg boundary (66 Ma) explaining that birds are living dinosaurs. Optionally add a few early birds such as *Archaeopteryx*.
8. **Story mode (optional, Phase 5).** A guided scroll through key moments: first dinosaurs, the Triassic–Jurassic extinction, the age of giants, feathers, and the asteroid.
9. **Languages: English and Polish.** All UI strings and species descriptions are translatable. Scientific names are never translated.

### Out of scope
Accounts, comments, user uploads, CMS, server-side rendering on demand, 3D models (maybe later), paid APIs.

---

## 2. Technical decisions (confirm these in ADR-0001)

### Frontend stack (recommended)
| Concern | Choice | Why |
|---|---|---|
| Build / dev | **Vite** with **React** and **TypeScript** (strict) | A fast single-page app. The timeline is one large interactive surface, so islands or SSR add little. |
| Styling | **Tailwind CSS** plus CSS variables for era themes | Fast iteration; easy theme switching per period. |
| Animation | **Motion** (formerly Framer Motion) for UI. Plain `requestAnimationFrame` and CSS transforms for timeline pan and zoom | Timeline movement has to stay at 60 fps. Don't run React re-renders on every scroll frame. |
| Time scale maths | **d3-scale** and **d3-zoom** (only those modules, not all of D3) | Proven zoom, pan and scale handling; maps Ma to pixels. |
| Rendering of timeline | DOM and SVG for bands and markers. Switch to Canvas only if profiling shows a need above about 500 visible items | Easier accessibility and styling. |
| Virtualisation | Render only the markers inside the visible window plus a buffer | Keeps the DOM small as the dataset grows. |
| State | **Zustand** for UI state; the URL query string as the source of truth for filters | Simple and shareable. |
| Search | **MiniSearch** (or Fuse.js) with an index built at build time | Search runs in the browser with no backend. |
| Routing | React Router: `/`, `/species/:slug`, `/about`, `/credits` | Deep links to species. |
| i18n | **i18next** / react-i18next | EN and PL. |
| Data validation | **Zod** schemas, plus a `pnpm validate:data` script that runs in CI | Bad data fails the build. |
| Images | Build-time pipeline using **sharp**: download, resize, and convert to AVIF and WebP, with responsive `srcset` and blur placeholders | Fast loading, and the files are hosted ourselves so they can't vanish. |
| Testing | **Vitest** and Testing Library for units; **Playwright** for end-to-end and visual checks; **axe-core** for accessibility | |
| Lint / format | ESLint (flat config) and Prettier | |
| Package manager | pnpm | |
| Hosting | **Azure Static Web Apps (Free tier)** or **GitHub Pages**, deployed by GitHub Actions | Static output, free, with preview environments for pull requests. |

Use the **latest stable** versions of everything. Check them when you set up; don't rely on version numbers you remember.

Rejected alternatives (record them in the ADR): Next.js (SSR not needed), Astro (a good fit for content but adds islands complexity around one large interactive component; fine to revisit), vis-timeline or TimelineJS (not flexible enough for semantic zoom and custom cards).

### Backend: not needed
- The content is small and changes rarely: about 100–300 species is roughly 1 MB of JSON before images.
- Search, filtering and sorting all run in the browser.
- Images are built at build time and served from the static host or CDN.
- **Build-time tooling replaces a backend.** `scripts/` contains Node/TypeScript scripts that:
  1. validate the data (Zod),
  2. fetch image metadata (author, licence, URL) from the Wikimedia Commons API for each image ID listed in the data,
  3. download and optimise images,
  4. build the search index and a `species.min.json` bundle split by period.
- Revisit this only if we later add user-generated content or a dataset of thousands of species. Neither is planned.

### Repository layout
```
scrollosaurus/
├─ CLAUDE.md
├─ .claude/agents/*.md
├─ docs/
│  ├─ decisions/            # ADRs
│  ├─ data-guidelines.md    # how to add a species, sourcing rules
│  └─ design/               # design tokens, era palettes, wireframes
├─ data/
│  ├─ geologic-time.json    # eras, periods, epochs, stages with Ma boundaries (ICS chart)
│  ├─ species/              # one file per species: tyrannosaurus.json …
│  ├─ groups.json           # group tree
│  └─ i18n/{en,pl}/         # translated descriptions
├─ scripts/                 # validate, fetch-images, build-index
├─ public/images/species/   # generated, optimised images
├─ src/
│  ├─ app/                  # routes, layout, providers
│  ├─ features/timeline/    # scale, zoom, bands, markers, virtualisation
│  ├─ features/species/     # card, detail drawer, size comparison
│  ├─ features/filters/     # filter bar, URL sync, search
│  ├─ components/ui/        # design-system primitives
│  ├─ lib/                  # schemas, data loaders, utils
│  └─ styles/
└─ tests/ (unit, e2e)
```

### Data model (Zod schemas; refine them in Phase 1)
```ts
Species {
  slug: string                      // "tyrannosaurus"
  scientificName: string            // "Tyrannosaurus rex"
  genus: string
  nameMeaning: { en: string; pl: string }
  group: { clade: "Theropoda" | "Sauropodomorpha" | "Ornithischia" | ...; subgroup?: string }
  isDinosaur: boolean               // false for pterosaurs, marine reptiles
  diet: "carnivore" | "herbivore" | "omnivore" | "piscivore" | "insectivore" | "uncertain"
  dietConfidence: "established" | "probable" | "debated"
  timeRange: { startMa: number; endMa: number; uncertaintyMa?: number }
  periods: ("Triassic" | "Jurassic" | "Cretaceous")[]   // derived & verified against timeRange
  size: { lengthM?: [min, max]; massKg?: [min, max]; heightM?: [min, max] }
  locations: { continent: string; country: string; formation?: string }[]
  discovery: { describedBy: string; year: number }
  summary: { en: string; pl: string }
  funFacts?: { en: string; pl: string }[]
  famous: boolean
  images: { commonsFile: string; kind: "fossil" | "skeleton-mount" | "life-reconstruction" | "skull"; alt: {en; pl}; credit: {author; license; licenseUrl; sourceUrl} }[]
  sources: { title: string; url: string; accessed: string }[]
  lastReviewed: string              // ISO date
}
```

Geological time boundaries come from the **latest ICS International Chronostratigraphic Chart**. Record the chart version in `geologic-time.json` and never hard-code dates in components.

---

## 3. Design direction

- Each period has its own visual identity: Triassic in arid ochre and red, Jurassic in lush fern green and teal, Cretaceous in flowering-plant warm tones fading to ash at the K–Pg boundary.
- Background layers move at different speeds as you scroll (parallax: sediment strata, plant silhouettes) while staying light on performance. Respect `prefers-reduced-motion`.
- Diet badges use **both icon and colour**, never colour alone:
  - predator: tooth / claw
  - herbivore: leaf
  - omnivore: combined icon
  - piscivore: fish
  - uncertain: "?"
- Typography: a characterful display face for headings and a highly readable sans-serif for body text.
- Must work at 360 px width. On touch devices the timeline becomes vertical.
- Dark mode by default ("deep time"), with a light mode toggle.

---

## 4. Subagents: create these files in `.claude/agents/`

Each agent has a narrow job and the minimum tools it needs. The main session orchestrates; agents report back with concise summaries and file lists.

### `.claude/agents/paleo-content-curator.md`
```markdown
---
name: paleo-content-curator
description: Use for researching, writing and fact-checking dinosaur species records in data/species/*.json, geologic time data, and EN/PL descriptions. Use proactively whenever species data is added or changed.
tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
model: opus
---
You are a palaeontology content curator for Scrollosaurus.

Rules:
- Never invent facts. Every numeric value (time range, length, mass) must come from a cited source (peer-reviewed papers, museum sites, Paleobiology Database, Wikipedia only as a pointer to primary sources).
- Time ranges are first/last appearance in the fossil record, in Ma, consistent with the latest ICS chart in data/geologic-time.json.
- Size estimates are given as ranges; mark debated values (e.g. Spinosaurus diet/posture) with dietConfidence "debated" and a note.
- Use current classification; note when a genus is considered dubious or synonymised.
- Clearly flag non-dinosaurs (pterosaurs, marine reptiles) with isDinosaur: false.
- Write summaries at a curious-teenager reading level, max 80 words; Polish translations must be natural Polish, not literal.
- Fill `sources` and `lastReviewed`. Run `pnpm validate:data` after edits.
Report: list of species changed, any uncertainties, and sources used.
```

### `.claude/agents/media-curator.md`
```markdown
---
name: media-curator
description: Use for finding, licensing-checking and recording images for species (Wikimedia Commons), and for maintaining the image pipeline and credits page.
tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch
model: sonnet
---
You manage all imagery for Scrollosaurus.

Rules:
- Only use files with licences: Public Domain, CC0, CC BY, CC BY-SA. Reject NC/ND, "fair use", or unclear licences.
- Prefer, in order: skeleton mounts / fossils from museums, then scientifically reviewed life reconstructions. Avoid outdated reconstructions (e.g. tail-dragging T. rex, unfeathered Velociraptor) unless labelled as historical.
- Record commonsFile, author, licence, licenceUrl, sourceUrl for each image; never strip attribution.
- Write meaningful alt text in EN and PL.
- Maintain scripts/fetch-images.ts (Commons API metadata + download) and scripts/optimize-images.ts (sharp → AVIF/WebP, widths 320/640/1280, blur placeholder).
- Never commit images without credit data. Keep /credits page in sync.
Report: images added, licences, any species still missing images.
```

### `.claude/agents/frontend-architect.md`
```markdown
---
name: frontend-architect
description: Use for architecture decisions, project structure, ADRs, state management, routing, data loading, build config and dependency choices. Consult before adding any new dependency.
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---
You own the technical architecture of Scrollosaurus (Vite + React + TypeScript strict, static-only, no backend).

Responsibilities:
- Keep the feature-folder structure clean; enforce boundaries (features don't import each other's internals).
- Write/update ADRs in docs/decisions/ for every significant choice, with rejected alternatives.
- Gate dependencies: justify size and maintenance; prefer small, tree-shakeable libraries.
- Data loading: split species bundles by period, lazy-load detail data and images.
- Keep the URL as the source of truth for filters/selection.
- Bundle budget: initial JS ≤ 200 KB gzipped; flag regressions.
Report: decisions made, files changed, risks.
```

### `.claude/agents/timeline-engineer.md`
```markdown
---
name: timeline-engineer
description: Use for everything inside src/features/timeline: time scale, zoom/pan, semantic zoom levels, period bands, species range markers, virtualisation, scroll/touch/keyboard interaction and timeline performance.
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---
You build the interactive timeline — the heart of Scrollosaurus.

Requirements:
- Use d3-scale (scaleLinear on Ma, reversed so older is left/top) and d3-zoom for transform state; apply transforms via CSS/SVG transform, not React state per frame.
- Semantic zoom: era → period → epoch → stage; label density adapts to zoom; markers collide-avoid with lane packing for overlapping ranges.
- Virtualise: render only items in viewport ± buffer.
- Input: wheel/trackpad, drag, pinch, keyboard (arrows, +/-, Home/End, Enter to open species), "jump to period" buttons.
- Horizontal on desktop, vertical on narrow/touch screens.
- 60 fps target on a mid-range laptop and phone with 300 species; profile and document results.
- Respect prefers-reduced-motion (no inertia/parallax).
- Expose a clean API: <Timeline items filters onSelect zoomTo />.
Report: what changed, perf measurements, known limitations.
```

### `.claude/agents/ui-designer.md`
```markdown
---
name: ui-designer
description: Use for design tokens, era themes, typography, iconography (diet badges), species cards, detail drawer, size-comparison silhouettes, layout and micro-interactions.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---
You design and implement the Scrollosaurus visual layer with Tailwind + CSS variables + Motion.

Principles:
- Distinctive, museum-meets-adventure aesthetic; dark "deep time" default and light mode.
- Era palettes: Triassic ochre/red, Jurassic fern/teal, Cretaceous warm florals → ash at K–Pg.
- Diet and group badges always pair icon + text/colour (never colour alone). Contrast ≥ WCAG AA.
- Size comparison: SVG silhouettes scaled to real proportions next to a 1.8 m human.
- Components live in src/components/ui; document tokens in docs/design/tokens.md.
- Mobile-first; test at 360, 768, 1280, 1920 px.
Report: components/tokens changed with screenshots via Playwright when possible.
```

### `.claude/agents/qa-a11y-perf.md`
```markdown
---
name: qa-a11y-perf
description: Use after each phase or significant feature to write/run tests and audit accessibility and performance. Use proactively before any merge to main.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---
You are the quality gate for Scrollosaurus.

Do:
- Unit tests (Vitest + Testing Library) for scale maths, filters, URL sync, data loaders, schema validation.
- E2E (Playwright): load, zoom, pan, filter by diet, search, open species via deep link, keyboard-only navigation, mobile viewport.
- Accessibility: axe-core in Playwright; screen-reader labels on markers; focus management in drawer; reduced-motion respected.
- Performance: Lighthouse CI targets — Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90; check bundle budget.
- Data: run pnpm validate:data; verify every image has credit data.
Report: pass/fail table, failing items with file:line and suggested fix. Do not silently weaken tests.
```

### `.claude/agents/code-reviewer.md`
```markdown
---
name: code-reviewer
description: Read-only reviewer. Use at the end of each phase to review the diff for correctness, readability, type safety, performance pitfalls and consistency with ADRs and CLAUDE.md.
tools: Read, Glob, Grep, Bash
model: opus
---
You review but never edit. Run `git diff main...HEAD` (or the given range).
Check: TypeScript strictness (no `any` without justification), React re-render hot paths in the timeline, accessibility, dead code, naming, ADR compliance, missing tests, licence/credit completeness.
Output: findings ranked Blocker / Should-fix / Nit, each with file:line and a concrete suggestion.
```

---

## 5. `CLAUDE.md` (create this at repo root)

Include:
- the project summary and hard constraints from section 0
- commands:
  - `pnpm dev`, `pnpm build`, `pnpm preview`
  - `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`
  - `pnpm validate:data`, `pnpm images`
- conventions: TypeScript strict, feature folders, named exports, no default exports except route components, Conventional Commits
- the rule: **all facts in `data/` need sources; all images need credits; the build fails otherwise**
- which subagent to use for what (one line each)
- definition of done for a task: typecheck, lint and tests all green; `validate:data` green; no accessibility regressions; the code-reviewer agent has run on the phase diff

---

## 6. Phase plan

Work phase by phase. At the end of each phase: run the `qa-a11y-perf` and `code-reviewer` agents, fix any blockers, commit, summarise what was done, and **stop for my review** before starting the next phase.

### Phase 0: Foundation
- Scaffold Vite, React, TypeScript, Tailwind, ESLint, Prettier, Vitest and Playwright with pnpm.
- Write `CLAUDE.md`, the agent files, ADR-0001 (architecture, no backend) and ADR-0002 (data and licensing policy).
- Set up GitHub Actions CI (typecheck, lint, test, build, validate:data) and deployment to Azure Static Web Apps or GitHub Pages. Ask me which.
- **Exit:** an empty app with era colour bands deploys from CI to a public URL.

### Phase 1: Data model and seed content
- Zod schemas, `geologic-time.json` (from the ICS chart), `groups.json`.
- About **30 seed species** spread across all three periods, all diets and all major groups. Include famous ones (T. rex, Triceratops, Stegosaurus, Brachiosaurus, Velociraptor, Spinosaurus, Allosaurus, Diplodocus, Ankylosaurus, Parasaurolophus, Coelophysis, Herrerasaurus, Plateosaurus) and a few less familiar ones (Eoraptor, Mamenchisaurus, Therizinosaurus, Microraptor, Pachycephalosaurus, Iguanodon, Carnotaurus, Argentinosaurus, Oviraptor, Baryonyx, Gallimimus).
- Plus 3–4 non-dinosaurs for the toggle layer (Pteranodon, Quetzalcoatlus, Mosasaurus, Plesiosaurus).
- Agents: `paleo-content-curator`, then `frontend-architect` reviews the schema.
- **Exit:** `pnpm validate:data` passes, every record has sources, and the uncertainties report has been reviewed by me.

### Phase 2: Timeline core
- Time scale, zoom, pan, semantic zoom levels, period/epoch/stage bands, range markers with lane packing, virtualisation and keyboard support. Horizontal and vertical layouts.
- Agent: `timeline-engineer`.
- **Exit:** smooth at 60 fps with the seed data duplicated to 300 items (a performance test fixture). Performance numbers documented.

### Phase 3: Species experience, filters and search
- Species cards, detail drawer, `/species/:slug` deep links, "lived alongside", diet and group filters, period, size and continent filters, search, URL sync.
- Agents: `ui-designer`, `frontend-architect`.
- **Exit:** a shared URL reproduces the exact view, and everything works by keyboard alone.

### Phase 4: Media pipeline and credits
- Commons metadata fetch, download, sharp optimisation, responsive images, blur placeholders, `/credits` page, image credits in the drawer.
- Agent: `media-curator`.
- **Exit:** every seed species has at least one licensed image, credits are complete, and the build fails if a credit is missing.

### Phase 5: Delight
- Era themes, parallax strata, size-comparison silhouettes, K–Pg extinction moment, "birds are dinosaurs" note, optional story mode, light/dark mode, page transitions.
- Agents: `ui-designer`, `timeline-engineer`.
- **Exit:** reduced-motion mode is fully respected and Lighthouse Performance is still at least 90.

### Phase 6: Internationalisation and content expansion
- i18next with EN and PL, a language switcher, and Polish translations of all content.
- Expand to **100+ species** in batches of 20, each batch reviewed by me.
- Agents: `paleo-content-curator`, `media-curator`.
- **Exit:** 100+ validated species in both languages, all with credited images.

### Phase 7: Hardening and launch
- Full accessibility audit, Lighthouse CI targets, SEO (meta tags, Open Graph images per species, sitemap, static pre-rendering of species pages if needed for social sharing), 404 page, an About page explaining sources and methods.
- Agents: `qa-a11y-perf`, `code-reviewer`.
- **Exit:** all quality targets met; tag `v1.0.0`.

---

## 7. Working rules for you, Claude
1. Plan before you code. For each phase, propose a task list, wait for my OK, then run it.
2. Delegate to the subagents above. Run independent tasks in parallel where possible, for example content curation alongside timeline engineering in Phase 2.
3. Ask before adding any dependency that isn't listed in section 2.
4. Keep commits small with Conventional Commit messages. Use one branch per phase and merge after review.
5. If a fact can't be verified, leave the field empty, mark it `uncertain` and list it in the phase report. Never fill it in with a guess.
6. Keep `docs/` current. Update ADRs when a decision changes.

**Start now:** create `CLAUDE.md`, the agent files and ADR-0001, then show me the detailed Phase 0 task list.

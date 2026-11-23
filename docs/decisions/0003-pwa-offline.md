# ADR-0003: Installable web app that works offline

- **Status:** Accepted (2026-11-23, Phase 6.2)
- **Deciders:** project owner, Claude (lead engineer)

## Context

Scrollosaurus is read-only and static, so it can be used without a connection once its files are
on the device, for example in a classroom or on a trip. Browsers install such a site as an app when
it has a web app manifest and a service worker. The hard constraints still apply: no backend, no
tracking, no user data, nothing beyond what's needed (CLAUDE.md, ADR-0001 §5). GitHub Pages can't
send custom headers, and the site lives under `/scrollosaurus/` (ADR-0001 §6).

Measured on the Phase 6.1 build: entry script 704 kB (about 208 kB gzip), CSS 34 kB, Polish strings
9 kB, five font files 135 kB, 103 species data chunks of about 6 kB each, 618 image files (37 MB),
and 212 HTML pages that are copies of just two page shells, English and Polish.

## Decision

### 1. No new dependency

The service worker is hand-written in TypeScript (`src/sw/`, about 150 lines). The small Vite plugin
`scripts/vite-pwa.ts` builds it to `dist/sw.js` and writes this build's file lists into it. The
plugin also renders the icons and writes the manifests. The build already knows every hashed file
name, and the site needs only three caching rules, so Workbox / `vite-plugin-pwa` would add a
dependency and configuration without removing much code (owner decision with the Phase 6.2 plan).
The caching decisions are pure functions in `src/sw/strategy.ts`, unit-tested in
`tests/unit/sw-strategy.test.ts`. `src/sw/sw.ts` has its own `tsconfig.json` (WebWorker types), and
the build fails if `sw.js` would import or export anything, because a classic service worker is one
self-contained file.

### 2. Manifest: one per language, one app

- `manifest.webmanifest` (English) and `pl/manifest.webmanifest` (Polish description, `lang: "pl"`,
  `start_url` `/scrollosaurus/pl/`) share one `id` and the whole site as `scope`. Installing from
  either language gives the same app, named and described in that language, and switching
  language stays inside the app. The English pages and `404.html` link the English manifest;
  `scripts/emit-route-html.ts` points every `/pl/` page at the Polish one and fails the build if the
  link is missing.
- `display: standalone`. `theme_color` and `background_color` are the dark theme's `--sc-bg`, read
  from `src/styles/index.css` at build time. A manifest holds one theme colour, and dark is the
  default theme. In light mode the `theme-color` meta tag, which `theme-init.js` and the theme switch
  already update, takes over while the app is open.
- Icons are rendered at build time with `sharp` (already a dev dependency) from `public/favicon.svg`,
  our own artwork: 192 px and 512 px PNGs, a 512 px maskable PNG (square background, stripes scaled
  to 75% so they stay inside the 80% safe zone) and a 180 px `apple-touch-icon`. They are written to
  `dist/icons/` and never committed.
- All URLs come from Vite's `base`, so `BASE_PATH=/` (a custom domain) needs no change.
- The CSP `<meta>` gains `worker-src 'self'` and `manifest-src 'self'`. `default-src 'self'` already
  allows both; they are stated for clarity.

### 3. What the service worker caches

| Request                                                                                                                                                                                                                                    | Strategy                                                                                           | Cache                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Entry script and CSS, the `pwa-register` chunk, Polish strings (`i18n-pl-*.js`), Latin and Latin Extended fonts, SVG textures, `theme-init.js`, favicon, icons, both manifests, both page shells (`/scrollosaurus/`, `/scrollosaurus/pl/`) | Downloaded at install; served from the cache                                                       | `scrollosaurus-precache-<version>`, one per build |
| Page loads (navigations)                                                                                                                                                                                                                   | Network first; offline, or after 4 s without an answer, the cached shell in the page's language    | —                                                 |
| Species data chunks                                                                                                                                                                                                                        | Cache first, saved when first opened; chunks the current build no longer has are removed on update | `scrollosaurus-species`                           |
| Images under `images/`                                                                                                                                                                                                                     | Cache first, saved when shown; at most 200 (about 10 MB), oldest saved removed first               | `scrollosaurus-images-<images version>`           |
| Anything else (other hosts, non-GET, URLs with a query, other font subsets)                                                                                                                                                                | Not touched                                                                                        | —                                                 |

- Every page is a copy of one of two shells, so once the worker is installed every route opens
  offline, not only visited ones. The species data and images a page shows are available offline
  once that page has been opened.
- On the first visit the page loads before the worker controls it. When the worker takes control,
  the page sends it the URLs it has already loaded (`CACHE_URLS`). The worker keeps only species
  chunks and images, the same files it would have cached itself, usually straight from the HTTP
  cache. So the first page visited also works offline.
- At install, hashed files under `assets/` may come from the HTTP cache (they never change).
  Unhashed ones are revalidated, so an older copy can't end up in a newer precache. The install then
  checks that every `assets/` file the two cached shells load is in the precache. If the host is
  mid-deploy and served a shell and `sw.js` from different builds, the install fails and is
  retried on a later visit, rather than keeping a shell that can't start offline.
- Image file names come from the Commons file name, not the content, so a new revision of a
  Commons file keeps its URL. The image cache is therefore named after a hash of everything under
  `public/images`: any change to the image set drops all cached images, so a cached picture can
  never sit next to a newer credit.
- The page asks the browser to keep up to 1000 resource-timing entries (the default is 250), so
  the first-visit list includes every image the timeline loaded.
- A weak connection that neither answers nor fails gets the cached shell after 4 s, not a blank
  page. A captive portal's `200` answer is taken as the page, which is the usual limitation.
- Only complete `200` same-origin responses are stored, never an error page.
- Species data is not downloaded up front (owner decision): about 636 kB more on a first visit for
  data most visitors never open.

### 4. Updates: offered, never forced

- `sw.js` has a fixed name. Its contents include a version (a hash of every built file and of the
  precached files copied from `public/`) and the image set's version, so each deploy that changes
  anything is a new worker. Browsers check `sw.js` on navigation.
- A new version installs in the background and waits. The old version stays in control of open
  tabs, so a page never mixes files from two builds while it waits.
- When a new version is waiting, including one that began installing while the page loaded, the
  layout shows a notice (`UpdateNotice`): an icon and the text "A new version of the site is
  ready.", a **Reload** button and a **Later** button.
  - A visually hidden, always-present `role="status"` region announces the text politely.
  - While the notice is up, `scroll-padding-bottom` keeps a focused element from scrolling under
    it (WCAG 2.4.11). It respects the bottom safe-area inset.
  - With `prefers-reduced-motion` it appears without animation.
  - **Later** hides it for that version only (also across a language switch, which remounts the
    layout); a newer version is offered again. Focus moves to `<main>` (or to the drawer heading).
  - The species drawer is a modal `<dialog>`, which makes the page behind it inert, so the drawer
    shows the same notice at the top of its body.
- **Reload** asks the waiting worker to take over (`SKIP_WAITING`), and the page reloads once it is
  in control. When the new version activates, it deletes older precaches, image sets and species
  chunks that are gone from the build. Other open tabs of the site were still on the old version and
  have now lost its files, so each is told so ("A new version of the site is running in another
  tab. Reload this page to keep using it."), with Reload and no Later. If nobody clicks Reload, the
  new version takes over after every tab of the site has closed.
- A tab left open across a deploy can still ask for a species chunk that no longer exists and was
  never cached; that is how the site behaved before. The species drawer shows its load error then,
  and the language layout's error page Retry button now switches to the waiting version when there
  is one, instead of reloading into the old one.

### 5. Registration

`src/lib/pwa.ts` (in the entry, well under 1 kB) starts registration after the `load` event, so it
never competes with the first paint. The registration code itself is a separate lazily loaded
chunk, `src/lib/pwa-register.ts`, and the entry gzip budget (211 kB) stays unchanged. It also
follows the waiting and installing workers and every change of controller (first visit: hand over
the loaded URLs; later: another tab switched versions). Production
builds only: the dev server never registers a worker, so hot reload is never served from a cache.

The router's basename now keeps its trailing slash (`/scrollosaurus/`). Without it, the home page's
address became `/scrollosaurus?from=…`, which is outside the worker's scope (`/scrollosaurus/`)
and so failed offline. On Pages that address was also answered with a redirect.

### 6. Privacy

No push notifications, no background sync, no periodic sync, no analytics, no requests to other
hosts. The worker only stores the site's own public files in the browser's Cache Storage; nothing
about the visitor is stored or sent. Removing the site's data in the browser removes everything.

### 7. Tests

- `tests/e2e/pwa.spec.ts` (desktop Chromium), with the worker enabled:
  - both manifests are valid, and their icons exist at the stated sizes;
  - every emitted HTML file links its language's manifest;
  - Chrome reports no installability errors (`Page.getInstallabilityErrors`);
  - the English home page, an English species page and a Polish species page reload offline with
    their species data;
  - pages not visited yet open offline in their language;
  - a new `sw.js` version shows the update notice (axe-clean); nothing reloads while it waits, and
    the old precache stays; Reload switches to the new version and removes the old precache;
  - a second open tab (Polish) is told to reload once the first switches;
  - with the species drawer open, the notice shows inside the drawer, and Later returns focus to
    the drawer heading.
- `tests/unit/sw-strategy.test.ts`, `pwa-register.test.ts` and `update-notice.test.tsx` cover the
  caching rules, worker tracking (waiting, installing, redundant, first visit, takeover by another
  tab) and the notice (Later per version, focus, live region).
- Every other spec runs with service workers blocked (`playwright.config.ts`), so `page.route` and
  network assertions still see every request.
- Lighthouse (≥ 90 performance, English and Polish pages) and the entry gzip budget are unchanged
  gates.

## Rejected alternatives

| Alternative                                  | Why rejected                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`vite-plugin-pwa` / Workbox**              | A new dependency and its configuration for three caching rules the build can already list. Revisit if caching needs grow (background sync, complex expiry).                           |
| **Silent update (`skipWaiting` on install)** | A tab could switch builds mid-session and request chunks of the wrong version.                                                                                                        |
| **Precaching every species chunk**           | About 636 kB extra on a first visit for data most visitors never open (owner decision). It would also have closed the gap for never-opened chunks in a tab left open across a deploy. |
| **Precaching all 212 HTML pages**            | They are copies of two shells; serving the shell for any page in its language gives the same result.                                                                                  |
| **A custom install button**                  | The browser's own install UI is enough; a button means more UI and strings for little gain.                                                                                           |
| **Module service worker (`type: 'module'`)** | Not supported everywhere yet; a classic worker built as one file works in every browser.                                                                                              |

## Consequences

- **+** The site installs as an app and works offline: every route, plus the species and images
  already viewed.
- **+** Repeat visits load the shell, scripts and fonts from the cache.
- **+** No new dependency; the caching rules are small and unit-tested.
- **−** After the first page has loaded, the worker downloads the precached files that page didn't
  need: the other language's shell (and, on English pages, the 4 kB Polish strings), the other font
  subsets and the icons. Files the page already loaded usually come from the HTTP cache.
- **−** A deploy reaches an open tab only after Reload, or after every tab of the site has closed.
- **−** We maintain the service worker ourselves, including cache housekeeping.

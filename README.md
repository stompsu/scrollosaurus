# Scrollosaurus

Dinosaurs on an interactive, zoomable timeline of the Mesozoic (252–66 million years ago). Every fact is sourced and every image is freely licensed and credited.

**Live:** https://stompsu.github.io/scrollosaurus/

A static site: no accounts, no tracking, no backend. Content lives in `data/` and is validated at build time.

## Develop

Requires Node 26 and pnpm 12.

```bash
pnpm install
```

```bash
pnpm dev
```

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Dev server                                    |
| `pnpm build`         | Validate data, build, write per-route HTML    |
| `pnpm preview`       | Serve the build                               |
| `pnpm test`          | Unit tests (Vitest)                           |
| `pnpm test:e2e`      | End-to-end + accessibility tests (Playwright) |
| `pnpm lint`          | ESLint + Prettier check                       |
| `pnpm typecheck`     | TypeScript                                    |
| `pnpm validate:data` | Validate everything in `data/`                |

## Docs

- [Architecture (ADR-0001)](docs/decisions/0001-architecture.md)
- [Data and licensing policy (ADR-0002)](docs/decisions/0002-data-and-licensing.md)
- [Adding a species](docs/data-guidelines.md)
- [Design tokens](docs/design/tokens.md)

## Credits

Geological time scale: International Chronostratigraphic Chart v2024/12, International Commission on Stratigraphy (CC BY 4.0).

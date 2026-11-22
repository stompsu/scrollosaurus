# Entry bundle

`tests/e2e/bundle.spec.ts` fails the e2e run if the entry chunk grows past its gzip budget
(211 kB, Node zlib at its default level, kB = 1000 bytes; this reads about 2 kB below the figure
`vite build` prints). Raise it only with a reason in the PR.

## Phase 6.1 measurement

`vite build` reported the entry at 212.8 kB gzip after Phase 6 and 209.9 kB after the Polish
strings moved to their own chunk (`i18n-pl-*.js`, 4.3 kB gzip, loaded only on `/pl/` pages). By the
test's own count the entry is 208.1 kB.

What is in it, from the build's source maps, in KiB (gzip is measured per part on its own, so the
parts don't add up to the total):

| Part                                                        | Raw    | Gzip alone |
| ----------------------------------------------------------- | ------ | ---------- |
| react-dom                                                   | 202 kB | 62 kB      |
| Species index (`virtual:species-index`, 103 species)        | 118 kB | 25 kB      |
| — of which image credits (`images` arrays)                  | 36 kB  | 9 kB       |
| — of which Polish text (name meanings, alt text)            | 13 kB  | —          |
| react-router                                                | 94 kB  | 30 kB      |
| i18next + react-i18next                                     | 54 kB  | 17 kB      |
| d3 (selection, transition, zoom, color, interpolate, scale) | 61 kB  | 21 kB      |
| minisearch                                                  | 17 kB  | 6 kB       |
| App code in `src/` (largest: Timeline, engine, drawer)      | 82 kB  | 25 kB      |

So most of the growth since Phase 5 (166.8 kB) came from i18next (new in Phase 6) and from the
species index growing from 34 to 103 species, not from the strings themselves.

## Options not taken yet (need an owner decision)

- **Move image credits out of the index** and load them with each species record, or as a
  separate chunk for the credits page: about 9 kB gzip off the entry. Cards and the drawer would
  then show the credit once the record (or chunk) has loaded.
- **Split the index's Polish text** into the Polish chunk: a few kB off the entry for English
  visitors, at the cost of a second index shape to build and validate.

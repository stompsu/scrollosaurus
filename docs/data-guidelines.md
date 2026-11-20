# Data guidelines: adding a species

> Policy background: [ADR-0002](decisions/0002-data-and-licensing.md). The schema is the source of
> truth: [`src/lib/schemas/species.ts`](../src/lib/schemas/species.ts).

## Where things live

| What                                        | Where                              |
| ------------------------------------------- | ---------------------------------- |
| One species                                 | `data/species/<slug>.json`         |
| Geological time (ICS chart)                 | `data/geologic-time.json`          |
| Group tree (clades, subgroups)              | `data/groups.json`                 |
| Site settings (primary species)             | `data/site.json`                   |
| Image credits (generated from Commons)      | `data/generated/` (Phase 4)        |
| Schemas and cross-file checks               | `src/lib/schemas/`                 |
| Optimised images (generated, not committed) | `public/images/species/` (Phase 4) |

Translatable text sits inline in each record as `{ "en": "…", "pl": "…" }`. **Polish is deferred to
Phase 6**: `en` is required, `pl` is optional, and `pnpm validate:data` prints one warning while it
is missing. Scientific names are never translated.

## Steps

1. **Pick a slug**: lowercase genus, hyphenated if needed (`tyrannosaurus`, `sinosauropteryx`). The
   file name must equal the slug.
2. **Gather sources first.** Peer-reviewed papers (with DOI), museum or university pages, the
   Paleobiology Database. Wikipedia only points to them. Give each source a short local `id`.
3. **Fill the record.** Every claim cites its sources by id:

   | Field                                   | Cites with                             |
   | --------------------------------------- | -------------------------------------- |
   | `nameMeaning` (etymology)               | `nameMeaning.sourceIds`                |
   | `group` (placement in `groups.json`)    | `groupSourceIds`                       |
   | `taxonomy` when dubious or contested    | `taxonomy.sourceIds` + `note`          |
   | `diet` + `confidence`                   | `diet.sourceIds` (+ `note` if debated) |
   | `timeRange` (first/last appearance, Ma) | `timeRange.sourceIds`                  |
   | `size.lengthM`, `massKg`, `heightM`     | each value's `sourceIds`               |
   | each `locations[]` entry                | its own `sourceIds`                    |
   | `discovery` (author, year)              | `discovery.sourceIds`                  |
   | each `funFacts[]` entry                 | its own `sourceIds`                    |

4. **Numbers.**
   - Sizes are `[min, max]` ranges. A single published value is `[v, v]`. An open-ended figure
     ("over 10 m") is `[10, 10]` with a `note` saying so.
   - `timeRange.startMa` is the older (larger) value. Use `startUncertaintyMa` / `endUncertaintyMa`
     only when the source gives them.
   - `periods` must match the time range against `data/geologic-time.json`. Touching a boundary
     does not count as living in the next period.
5. **Places.** `continent` is one of the schema's ids; `countryCode` is ISO 3166-1 alpha-2
   (`US`, `CN`, `AR`). `formation` is the name as the source spells it, without the word
   "Formation" (`Hell Creek`, `Yixian`), so species can later be matched by formation.
6. **When unsure, leave it out.** Leave the field empty and add an entry to `uncertain` with the
   field and a note. A missing length or mass that is not listed in `uncertain` produces a warning.
   Use `diet.confidence: "debated"` (with a note) for contested diets, and
   `taxonomy.status: "dubious"` or `"contested"` for doubtful genera.
7. **Non-dinosaurs** (pterosaurs, marine reptiles): `isDinosaur: false`, and a non-dinosaur group.
8. **Text.** `summary` is at most 80 words for a curious teenager. Fun facts are optional and
   sourced.
9. **Images.** List only the Commons file, its kind and alt text. Credits are fetched from Commons in
   Phase 4; never type them by hand.
10. **Set `lastReviewed`** to today and run `pnpm validate:data`. It prints errors, warnings and
    the list of fields flagged as uncertain.

## Product notes

- **Primary species: _Sinosauropteryx_.** When the page loads with no species or filter in the URL,
  the timeline highlights _Sinosauropteryx_ first. Its slug is `primarySpecies` in
  `data/site.json`; the build fails if that species file is missing.

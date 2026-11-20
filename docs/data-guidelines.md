# Data guidelines: adding a species

> Draft (Phase 0). The full schema arrives in Phase 1; this page will be updated then.
> Policy background: [ADR-0002](decisions/0002-data-and-licensing.md).

## Where things live

| What                                                     | Where                              |
| -------------------------------------------------------- | ---------------------------------- |
| One species                                              | `data/species/<slug>.json`         |
| Geological time (ICS chart)                              | `data/geologic-time.json`          |
| Group tree (clades, subgroups)                           | `data/groups.json` (Phase 1)       |
| Translated long text                                     | `data/i18n/{en,pl}/` (Phase 6)     |
| Schemas                                                  | `src/lib/schemas/`                 |
| Generated images (never edit by hand, not committed yet) | `public/images/species/` (Phase 4) |

## Steps

1. **Pick a slug**: lowercase genus, hyphenated if needed (`tyrannosaurus`, `sinosauropteryx`).
2. **Gather sources first.** At least one primary or museum source for the time range and for each size value. Record title, URL and the date you accessed it.
3. **Fill the record** following the schema. Use ranges for sizes. Use the first and last appearance in the fossil record for the time range, in Ma.
4. **When unsure, leave it out.** Empty field + note in the phase uncertainties report. Use `dietConfidence: "debated"` for contested diets.
5. **Non-dinosaurs** (pterosaurs, marine reptiles): `isDinosaur: false`.
6. **Text**: summary ≤ 80 words, written for a curious teenager. Polish must read naturally, not as a literal translation. Scientific names are never translated.
7. **Images**: add only the Commons file name; `pnpm images` fetches credit metadata. Allowed licences: PD, CC0, CC BY, CC BY-SA.
8. **Set `lastReviewed`** to today and run:

   ```bash
   pnpm validate:data
   ```

9. Open a PR. The `paleo-content-curator` agent can draft and fact-check; a human reviews every batch.

## Product notes

- **Primary species: _Sinosauropteryx_.** When the page loads with no species or filter in the URL, the timeline highlights _Sinosauropteryx_ first. It must be in the Phase 1 seed set. Keep its slug in config/data, not hard-coded in components.

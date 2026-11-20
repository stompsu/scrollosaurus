# Phase 1 uncertainties report

- **Date:** 2026-11-20
- **Scope:** 34 seed records (30 dinosaurs, 4 non-dinosaurs), `data/groups.json`, ICS epochs and stages.
- **Status:** awaiting owner review (Phase 1 exit criterion).

`pnpm validate:data` prints the live list of flagged fields; this report adds the judgement calls
behind them and the points that need a decision.

## Checks run

- All 34 species and the group tree pass `pnpm validate:data`. Every fact cites a source by id.
- All **58 DOIs** resolve, and their titles and years match Crossref.
- **150 non-DOI source URLs**: 91 return 200. The other 59 are Paleobiology Database pages
  (`paleobiodb.org/classic/…`), which answer automated requests with 403; they open in a browser.
- No Wikipedia sources are cited. Sources the curators could not open, or could only see the
  abstract of, are **not** cited for any value (listed at the end).

## Decisions for you

1. **Herrerasaurus placement.** Studies disagree on whether herrerasaurids are early theropods
   (Nesbitt et al. 2009; Martinez et al. 2011), near sauropodomorphs (Baron et al. 2017) or outside
   both (PBDB). `Herrerasauridae` sits directly under Dinosauria and is offered in the group
   filter. Alternative: put it under Theropoda.
2. **Sinosauropteryx family (primary species).** Kept in `Compsognathidae`. Qiu et al. 2025 propose
   `Sinosauropterygidae` (PBDB already uses it); Hendrickx 2025 disputes this. Renaming later only
   changes one group id.
3. **Wingspan for pterosaurs.** The schema has length, mass and height only. Pteranodon and
   Quetzalcoatlus have no size at all, although wingspan (about 10 m for Quetzalcoatlus, Witton &
   Naish 2008) is the measure people know. Proposal: add an optional `size.wingspanM` in Phase 2.
4. **Size outliers to accept or drop:**
   - _Iguanodon_ mass 4–15 t: NHM's 4 t vs 15 t from limb-bone scaling (Benson et al. 2014).
   - _Pachycephalosaurus_ 3 m / 450 kg: the only verified figure (NHM); likely low.
   - Many sizes come from the NHM Dino Directory alone (method not stated), stored as `[v, v]`
     with a note.

## Flagged fields (39)

| Species         | Field                     | Why                                                                         |
| --------------- | ------------------------- | --------------------------------------------------------------------------- |
| Archaeopteryx   | group                     | One analysis (Xu et al. 2011) moved it into Deinonychosauria, weak support. |
| Archaeopteryx   | taxonomy                  | Possible "species flock" (Rauhut et al. 2018).                              |
| Argentinosaurus | length, mass              | Fragmentary; 35–39.7 m and 60–88 t depending on method.                     |
| Argentinosaurus | timeRange                 | Huincul Fm. age poorly constrained; PBDB still says Middle Albian.          |
| Baryonyx        | locations                 | Spanish material listed by NHM not verified as _B. walkeri_.                |
| Carnotaurus     | timeRange                 | Maastrichtian (Pol et al. 2024) vs Campanian–Maastrichtian (older work).    |
| Diplodocus      | taxonomy                  | _D. carnegii_ proposed as type species; no ICZN ruling verified.            |
| Eoraptor        | group                     | Described as a theropod; now usually a sauropodomorph (Martinez 2011).      |
| Gallimimus      | diet                      | Herbivory, omnivory and filter-feeding all proposed.                        |
| Herrerasaurus   | group, mass               | Placement unresolved (see above); no verified mass.                         |
| Iguanodon       | timeRange                 | Older referrals excluded as doubtful (Gasulla et al. 2022).                 |
| Mamenchisaurus  | length, mass              | Only genus-level figures exist; none for _M. constructus_.                  |
| Microraptor     | taxonomy                  | Some diet studies used _M. gui_; synonymy not checked.                      |
| Mosasaurus      | mass, timeRange           | No verified mass; Campanian start depends on "M. maximus" synonymy.         |
| Oviraptor       | diet                      | No direct evidence; eggs, shellfish and plants all proposed.                |
| Parasaurolophus | timeRange                 | 77–73 Ma is the genus range, not _P. walkeri_ alone.                        |
| Plateosaurus    | mass                      | NHM's 4 t looks like an outlier; method-based estimate not verified.        |
| Plesiosaurus    | length, mass              | No verified figures.                                                        |
| Psittacosaurus  | timeRange, length         | Type locality dated only "Early Cretaceous"; sizes genus-level.             |
| Pteranodon      | length, mass, time, group | Wingspan not modelled; stage-level ages; family not verified.               |
| Quetzalcoatlus  | length, mass              | Wingspan not modelled; no species-specific mass.                            |
| Shuvuuia        | diet, mass                | Insectivory inferred from anatomy; no mass estimate.                        |
| Sinosauropteryx | group, length             | Family debate (see above); genus-level length only.                         |
| Spinosaurus     | diet, length              | Underwater hunter vs wader; 14 m vs over 15 m reconstructions.              |
| Therizinosaurus | length, mass              | Known from limbs and ribs; single mass estimate.                            |

Debated diets are also marked in the data with `confidence: "debated"`: Spinosaurus, Oviraptor,
Gallimimus, Quetzalcoatlus.

## Other judgement calls

- **Time ranges** are for the species named in `scientificName` (usually the type species). Where
  sources give only a stage, the ICS v2024/12 stage boundaries are used and the note says so.
  Isolated outlying PBDB referrals were excluded and noted (Spinosaurus, Velociraptor, Oviraptor,
  Gallimimus, Plateosaurus, Tyrannosaurus, Triceratops).
- **Sinosauropteryx colour.** The famous 2010 reddish-brown reconstruction (Zhang et al. 2010) used
  a specimen that Qiu et al. 2025 made the holotype of a new genus, _Huadanosaurus_. The record
  uses Smithwick et al. 2017 (countershading, banded tail, "bandit mask") and tells the 2010 story
  as a fun fact. Its time range is the U-Pb bracket for the Yixian Formation (Zhong et al. 2021).
- **Type-species changes** are recorded in `taxonomy.note`: Plateosaurus (ICZN Opinion 2435),
  Stegosaurus (Opinion 2320), Allosaurus (neotype proposal).
- **Famous flag** follows the kickoff list (plus Archaeopteryx, Pteranodon and Mosasaurus).
  Sinosauropteryx is `famous: false`; it is highlighted as the primary species independently.
- **ICS chart:** the chart page shows the Triassic–Jurassic boundary as "~201.4 ± 0.2". It is
  recorded as 201.4 ± 0.2 without the approximate flag, as in Phase 0. The "~" may only reflect
  how the chart page renders the Rhaetian row; to confirm against the chart PDF.

## Sources not used because they could not be verified

Sereno et al. 2013 (Eoraptor osteology), Mallison 2010 (Plateosaurus mass), Storrs 1997
(Plesiosaurus), Arbour & Mallon 2017 (Ankylosaurus size; cited for classification only), Lehman
2021 and Andres & Langston 2021 (Quetzalcoatlus), Barrett 2005 (ornithomimid diet), Hone et al.
2012 (Velociraptor feeding), Therrien & Henderson 2007 (Sinosauropteryx size), Charig & Milner
1997 (Baryonyx gut contents), Pei et al. 2014 (_M. gui_), Novas et al. 2021 (removed from the
group tree).

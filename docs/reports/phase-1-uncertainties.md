# Phase 1 uncertainties report

- **Date:** 2026-11-20
- **Scope:** 34 seed records (30 dinosaurs, 4 non-dinosaurs), `data/groups.json`, ICS epochs and stages.
- **Status:** reviewed by the owner on 2026-11-21 (decisions below).

`pnpm validate:data` prints the live list of flagged fields; this report adds the judgement calls
behind them and the points that need a decision.

## Checks run

- All 34 species and the group tree pass `pnpm validate:data`. Every fact cites a source by id,
  including every claim in the summaries (enforced by the schema since the code review).
- All **58 DOIs** resolve, and their titles and years match Crossref.
- **150 non-DOI source URLs**: 91 return 200. The other 59 are Paleobiology Database pages
  (`paleobiodb.org/classic/…`), which answer automated requests with 403; they open in a browser.
- No Wikipedia sources are cited. Sources the curators could not open, or could only see the
  abstract of, are **not** cited for any value (listed at the end).

## Owner decisions (2026-11-21)

1. **Herrerasaurus → Theropoda.** `Herrerasauridae` now sits under Theropoda, following Sereno &
   Novas 1992, Nesbitt et al. 2009 and Martinez et al. 2011. The record still flags the placement
   as debated (Baron et al. 2017 and PBDB disagree).
2. **Sinosauropteryx family:** kept as `Compsognathidae`, flagged as debated.
3. **Wingspan:** added as an optional, sourced `size.wingspanM`. The owner proposed 7 m for
   Pteranodon and 12 m for Quetzalcoatlus; the recorded values are what verified sources give:
   - Pteranodon **5.5–7.25 m** (Field Museum 2018; Witton & Habib 2010, citing Bennett 2001). The
     7 m figure is supported.
   - Quetzalcoatlus **10–11.9 m** (Witton & Naish 2008; Witton & Habib 2010; NPS, 36–39 ft).
     **12 m is not supported** as an estimate: it appears only as a span Langston assumed for mass
     calculations, as reported by Witton & Naish 2008. The record's note says so.
4. **Size outliers:** Iguanodon (4–15 t) and Pachycephalosaurus (450 kg) kept, flagged as uncertain.

## Flagged fields (43)

| Species            | Field                     | Why                                                                              |
| ------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| Archaeopteryx      | group                     | One analysis (Xu et al. 2011) moved it into Deinonychosauria, weak support.      |
| Archaeopteryx      | taxonomy                  | Possible "species flock" (Rauhut et al. 2018).                                   |
| Argentinosaurus    | length, mass              | Fragmentary; 35–39.7 m and 60–88 t depending on method.                          |
| Argentinosaurus    | timeRange                 | Huincul Fm. age poorly constrained; PBDB still says Middle Albian.               |
| Baryonyx           | locations                 | Spanish material listed by NHM not verified as _B. walkeri_.                     |
| Carnotaurus        | timeRange                 | Maastrichtian (Pol et al. 2024) vs Campanian–Maastrichtian (older work).         |
| Diplodocus         | taxonomy                  | _D. carnegii_ proposed as type species; no ICZN ruling verified.                 |
| Eoraptor           | group                     | Described as a theropod; now usually a sauropodomorph (Martinez 2011).           |
| Gallimimus         | diet                      | Herbivory, omnivory and filter-feeding all proposed.                             |
| Herrerasaurus      | group, mass               | Placed in Theropoda (owner decision); still debated. No verified mass.           |
| Iguanodon          | timeRange, mass           | Older referrals excluded (Gasulla et al. 2022); mass 4–15 t depending on method. |
| Mamenchisaurus     | length, mass              | Only genus-level figures exist; none for _M. constructus_.                       |
| Microraptor        | taxonomy                  | Some diet studies used _M. gui_; synonymy not checked.                           |
| Mosasaurus         | mass, timeRange           | No verified mass; Campanian start depends on "M. maximus" synonymy.              |
| Oviraptor          | diet                      | No direct evidence; eggs, shellfish and plants all proposed.                     |
| Pachycephalosaurus | mass                      | Single museum figure (NHM), likely low.                                          |
| Parasaurolophus    | timeRange                 | 77–73 Ma is the genus range, not _P. walkeri_ alone.                             |
| Plateosaurus       | mass                      | NHM's 4 t looks like an outlier; method-based estimate not verified.             |
| Plesiosaurus       | length, mass              | No verified figures.                                                             |
| Psittacosaurus     | timeRange, length, mass   | Type locality dated only "Early Cretaceous"; sizes genus-level.                  |
| Pteranodon         | length, mass, time, group | No verified body length; stage-level ages; family not verified.                  |
| Quetzalcoatlus     | length, mass, diet        | No verified body length or species mass; ground forager vs water prober.         |
| Shuvuuia           | diet, mass                | Insectivory inferred from anatomy; no mass estimate.                             |
| Sinosauropteryx    | group, length             | Family debate (see above); genus-level length only.                              |
| Spinosaurus        | diet, length              | Underwater hunter vs wader; 14 m vs over 15 m reconstructions.                   |
| Therizinosaurus    | length, mass              | Known from limbs and ribs; single mass estimate.                                 |

Debated diets are also marked in the data with `confidence: "debated"`: Spinosaurus, Oviraptor,
Gallimimus, Quetzalcoatlus.

## Changes from the phase-end review

The code review found that summaries carried facts with no sources. Summaries now cite sources, and
the curators checked every claim against them:

- **Claims removed** because no verified source supported them, e.g. Plateosaurus in France and
  Greenland (PBDB lists them only at genus level), Mosasaurus "first skulls near Maastricht", the
  Ankylosaurus/T. rex/Triceratops "alongside" claims, Brachiosaurus's giraffe comparison,
  "remarkably long tail" for Sinosauropteryx.
- **Claims softened** to what the sources say, e.g. Archaeopteryx "first bird" → "bird-like
  dinosaur"; Quetzalcoatlus "largest" → "among the largest animals known to fly"; Spinosaurus
  "largest" → "longest"; Microraptor "hundreds of fossils" → "about 300 specimens" (NHM).
- **Values corrected:** Baryonyx excavation date (May–June 1983) and claw length (31 cm, NHM);
  Plesiosaurus dolichodeirus authority (Conybeare 1824, not the genus authors); a Shuvuuia diet note
  that overstated what Leedham et al. 2026 covers.
- **Discovery** now lists surnames only; naming history moved to `discovery.note`.
- **To note:** two citations were added to notes that already named the study but whose full text
  the second-pass curator could not reopen: Mazzetta et al. 2004 (Carnotaurus age) and Ibrahim et
  al. 2014 (Spinosaurus length, read via Henderson 2018).

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
- **ICS chart (resolved 2026-11-21):** the chart web page shows the Triassic–Jurassic boundary as
  "~201.4 ± 0.2". The v2024/12 chart PDF gives "201.4 ±0.2" with no "~", so the record stays
  exact. Checking every Mesozoic boundary against the PDF found two outdated values, now fixed:
  the Anisian base (Early/Middle Triassic) is 246.7 Ma, not 247.0, and the Olenekian base is
  249.9 Ma, not 250.8. Neither is marked approximate on the chart. All other Mesozoic boundaries
  match.

## Sources not used because they could not be verified

Sereno et al. 2013 (Eoraptor osteology), Mallison 2010 (Plateosaurus mass), Storrs 1997
(Plesiosaurus), Arbour & Mallon 2017 (Ankylosaurus size; cited for classification only), Lehman
2021 and Andres & Langston 2021 (Quetzalcoatlus), Barrett 2005 (ornithomimid diet), Hone et al.
2012 (Velociraptor feeding), Therrien & Henderson 2007 (Sinosauropteryx size), Charig & Milner
1997 (Baryonyx gut contents), Pei et al. 2014 (_M. gui_), Novas et al. 2021 (removed from the
group tree).

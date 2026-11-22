# Phase 6, batch 2: 20 new species (54 → 74)

Researched by two `paleo-content-curator` agents, images chosen by `media-curator`, every record in
English and Polish. `pnpm validate:data` passes: 74 species, 74 credited images, Polish everywhere.
Every DOI was checked against Crossref (title and year), every PBDB taxon number against the PBDB
API, and every other source link loads.

The batch fills gaps: the Triassic, Africa, Australia, China, and the flying and swimming reptiles.

## Records

| Species                          | Species used     | Lived (Ma)    | Length (m) | Mass      | Diet      | Group in our tree |
| -------------------------------- | ---------------- | ------------- | ---------- | --------- | --------- | ----------------- |
| Mussaurus                        | M. patagonicus   | 192.8 ⚑       | — ⚑        | 0.9–1.9 t | herbivore | sauropodomorpha   |
| Thecodontosaurus                 | T. antiquus      | 205.7–201.4 ⚑ | 2.5        | — ⚑       | herbivore | sauropodomorpha   |
| Liliensternus                    | L. liliensterni  | 227.3–205.7 ⚑ | 5          | — ⚑       | carnivore | coelophysoidea ⚑  |
| Eudimorphodon (not a dinosaur)   | E. ranzii        | 227.3–205.7 ⚑ | — ⚑        | — ⚑       | piscivore | pterosauria       |
| Massospondylus                   | M. carinatus     | 201.4–184.2 ⚑ | 4          | — ⚑       | omnivore  | sauropodomorpha   |
| Heterodontosaurus                | H. tucki         | 201.4–192.9 ⚑ | 1.1–1.2    | — ⚑       | herbivore | ornithischia      |
| Compsognathus                    | C. longipes      | 154.8–143.1 ⚑ | 0.7        | 3 kg      | carnivore | compsognathidae   |
| Guanlong                         | G. wucaii        | 161.5–154.8 ⚑ | 3–4        | — ⚑       | carnivore | coelurosauria     |
| Shunosaurus                      | S. lii           | 170.9–154.8 ⚑ | 10         | — ⚑       | herbivore | sauropoda         |
| Huayangosaurus                   | H. taibaii       | 170.9–154.8 ⚑ | 4.5        | — ⚑       | herbivore | stegosauria       |
| Rhamphorhynchus (not a dinosaur) | R. muensteri     | 152.2–145.1 ⚑ | — ⚑        | — ⚑       | piscivore | pterosauria       |
| Suchomimus                       | S. tenerensis    | 115–105       | 11         | — ⚑       | piscivore | spinosauridae     |
| Ouranosaurus                     | O. nigeriensis   | 115–105 ⚑     | 7          | — ⚑       | herbivore | ornithopoda       |
| Nigersaurus                      | N. taqueti       | 115–105       | 9          | 4 t       | herbivore | sauropoda         |
| Majungasaurus                    | M. crenatissimus | 72.2–66       | 6–7        | — ⚑       | carnivore | abelisauridae     |
| Australovenator                  | A. wintonensis   | 95–93 ⚑       | 5–6        | — ⚑       | carnivore | tetanurae ⚑       |
| Amargasaurus                     | A. cazaui        | 125.8–121.4 ⚑ | 12         | 9 t ⚑     | herbivore | sauropoda         |
| Tarbosaurus                      | T. bataar        | 72.2–66 ⚑     | 10         | — ⚑       | carnivore | tyrannosauridae   |
| Pachyrhinosaurus                 | P. canadensis    | 74–72.5 ⚑     | 8          | 4 t       | herbivore | ceratopsia        |
| Elasmosaurus (not a dinosaur)    | E. platyurus     | 83.6–72.2 ⚑   | — ⚑        | — ⚑       | carnivore | plesiosauria      |

⚑ = left empty or flagged `uncertain`, with a note in the record. Most time ranges are stage-level
(PBDB or ICS stage bounds), and each record says so. Only Mussaurus has a radiometric date, and it
is a maximum age for the fossil beds (U–Pb, Otero et al. 2019), not a first and last appearance.

## Notable choices

- **Museum figures corrected.** The NHM Dino Directory puts Massospondylus (208–204 Ma) and
  Heterodontosaurus (205 Ma) in the Triassic, Compsognathus (145–140 Ma) in the Cretaceous, and
  Liliensternus at 205–202 Ma against the Norian of Rauhut and PBDB. The records use the literature
  and PBDB and explain the difference in notes.
- **Nigersaurus length:** 9 m (Sereno et al. 2007), not the 15 m of Sereno et al. 1999; noted.
- **Suchomimus:** taxonomy `contested`. It may be the same animal as the earlier-named
  _Cristatusaurus_, and some authors move it into _Baryonyx_.
- **Naming years:** Ouranosaurus 1976 (the formal description, not the 1972 informal use PBDB
  gives); Compsognathus 1861 (PBDB, not NHM's 1859); Elasmosaurus 1868 (explained by Sachs et al.
  2013); Thecodontosaurus 1836 for the genus, with the 1843 species name in the note.
- **Locations left out as unverified:** Ouranosaurus (Tunisia, Cameroon, Sudan), Tarbosaurus
  (China, Russia), Elasmosaurus sp. (Japan, Wyoming), Liliensternus (Switzerland; NHM's "France" is
  now _Lophostropheus_), Massospondylus (Lesotho, Namibia: genus-level only), Heterodontosaurus
  (Lesotho), older Australovenator records.
- **Single museum figures:** Amargasaurus (12 m, 9 t), Tarbosaurus (10 m), Pachyrhinosaurus (8 m,
  4 t, genus-level) and Compsognathus (0.7 m, 3 kg) rest on one NHM figure each, noted.
- **Thin sources:** Eudimorphodon's name meaning comes from pteros.com (not peer-reviewed); Mussaurus's
  name meaning and plant diet from a National Geographic article.
- **`describedBy` for long author lists:** "Sereno et al." (Suchomimus, Nigersaurus) and "Hocknull
  et al." (Australovenator), matching the two "et al." entries already in the data. Guanlong uses the
  "A, B & C" form like Microraptor.

## Fixes made in checking

- Three source titles had a parenthetical added by the curator ("(treatment of …)"); restored to
  the published titles.
- **Polish quotation marks:** the name meaning was wrapped in English “…” in both languages. It now
  comes from the language files, so Polish shows „…” (separate commit, with an e2e check).
- The "size unknown" filter test now works out its expected list from the data instead of a fixed
  list, which every new batch would break.

## Images

All 20 credited (CC BY, CC BY-SA). Changes after reviewing the contact sheet:

- **Nigersaurus:** the chosen life drawing was cartoon-like, and the first fallback (a skull photo)
  was dominated by a large company logo. Now a cast skull at the Royal Ontario Museum (CC BY-SA 3.0),
  which shows its famous teeth.
- **Shunosaurus:** the photo shows several mounted skeletons; the alt text now says so.

Weak as main images: **Thecodontosaurus** (loose fossil blocks), and three life restorations used
because no usable fossil photo exists: **Mussaurus**, **Australovenator** and **Elasmosaurus**. For
Majungasaurus and Pachyrhinosaurus, the curator skipped mounts that Commons categorises as
inaccurate.

## For the owner

1. **Group nodes:** a `tyrannosauroidea` node would place Guanlong properly (now `coelurosauria`).
   Liliensternus sits at `coelophysoidea` but is flagged: PBDB and Martill et al. 2016 place it only
   in Neotheropoda, so `theropoda` is the safer choice. Australovenator stays at `tetanurae`
   (megaraptoran placement disputed).
2. **Thin sources** for Eudimorphodon's and Mussaurus's name meanings: keep, or leave the meaning
   empty until a scholarly source is found?
3. **Batch 3:** about 20 more species, then a smaller batch 4 to pass 100.

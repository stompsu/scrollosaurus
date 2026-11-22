# Phase 6, batch 3: 21 new species (74 → 95)

Researched by two `paleo-content-curator` agents, images chosen by `media-curator`, every record in
English and Polish. `pnpm validate:data` passes: 95 species, 95 credited images. Every DOI was checked
against Crossref or the publisher page, every PBDB taxon number against the PBDB API, and every
other link opens (three that refuse scripts were opened in a browser).

First species from India, Romania, Brazil and Poland; more from Mongolia, China and Antarctica;
feathered dinosaurs and titanosaurs. Lisowicia was added at the owner's request.

## Records

| Species                        | Species used     | Lived (Ma)    | Length (m)     | Mass      | Diet      | Group in our tree    |
| ------------------------------ | ---------------- | ------------- | -------------- | --------- | --------- | -------------------- |
| Saturnalia                     | S. tupiniquim    | 233.2 ⚑       | — ⚑            | 6.5 kg    | carnivore | sauropodomorpha      |
| Silesaurus (not a dinosaur)    | S. opolensis     | 233.6–227.3 ⚑ | — ⚑            | 15 kg     | omnivore  | silesauridae (new) ⚑ |
| Lisowicia (not a dinosaur)     | L. bojani        | 210–205       | 4.5            | 9 t       | herbivore | dicynodontia (new)   |
| Anchiornis                     | A. huxleyi       | 160.9–160.3 ⚑ | 0.6            | — ⚑       | carnivore | avialae ⚑            |
| Yutyrannus                     | Y. huali         | 125.8–124.1 ⚑ | 7.5–9          | 1.1–1.4 t | carnivore | coelurosauria        |
| Caudipteryx                    | C. zoui          | 125.8–124.1 ⚑ | 1              | 2 kg      | omnivore  | oviraptorosauria     |
| Citipati                       | C. osmolskae     | 83.6–72.2     | 2.1            | — ⚑       | omnivore  | oviraptorosauria     |
| Deinocheirus                   | D. mirificus     | 72.2–66       | 10–11          | 6.4 t     | omnivore  | ornithomimosauria    |
| Opisthocoelicaudia             | O. skarzynskii   | 72.2–66       | 12             | — ⚑       | herbivore | titanosauria         |
| Saltasaurus                    | S. loricatus     | 72.2–66       | 12 ⚑           | — ⚑       | herbivore | titanosauria         |
| Patagotitan                    | P. mayorum       | 113.2–100.5   | 37.5 ⚑         | 42–71 t   | herbivore | titanosauria         |
| Rapetosaurus                   | R. krausei       | 72.2–66       | — ⚑            | — ⚑       | herbivore | titanosauria         |
| Rajasaurus                     | R. narmadensis   | 72.2–66       | 6.6–9          | — ⚑       | carnivore | abelisauridae        |
| Antarctopelta                  | A. oliveroi      | 83.6–72.2     | up to 4        | — ⚑       | herbivore | ankylosauria         |
| Hypsilophodon                  | H. foxii         | 125.8–121.4   | 2              | 20 kg     | herbivore | ornithopoda ⚑        |
| Magyarosaurus                  | M. dacus         | 72.2–66       | 5              | 900 kg    | herbivore | titanosauria         |
| Hatzegopteryx (not a dinosaur) | H. thambema      | 72.2–66       | — (span 10–12) | — ⚑       | carnivore | azhdarchidae         |
| Centrosaurus                   | C. apertus       | 76.5–74.4     | 6              | 1 t       | herbivore | ceratopsia           |
| Chasmosaurus                   | C. belli         | 76.5–74.4     | 5              | 2.5 t     | herbivore | ceratopsia           |
| Stegoceras                     | S. validum       | 76.5–74.4     | 2.4            | — ⚑       | herbivore | pachycephalosauria   |
| Borealopelta                   | B. markmitchelli | 112–110 ⚑     | 5–6            | ≥ 1.3 t   | herbivore | ankylosauria         |

⚑ = left empty or flagged `uncertain`, with a note in the record. Many ranges are stage-level (noted in
each record). Saturnalia's date is a maximum age for its rocks, and the three Dinosaur Park species use
the formation's dated base and top, which is wider than each species' real range.

## New groups

`silesauridae` and `dicynodontia`, both non-dinosaur roots with sources (PBDB, Nesbitt et al. 2010,
Sulej & Niedźwiedzki 2019). New outlines for the size comparison and the timeline icons cover them, and
Ichthyosaurus no longer falls back to a theropod outline.

## Notable choices

- **Silesaurus as "not a dinosaur"** follows Nesbitt et al. 2010 (silesaurids as the sister group of
  dinosaurs). PBDB instead places silesaurids inside Ornithischia, following Müller & Garcia 2020 and
  Norman 2022. The record flags this.
- **Lisowicia:** "not a dinosaur, nor even a reptile", a dicynodont, a relative of mammals (UCMP).
  Size and age come from Uppsala University's release on the 2019 _Science_ paper, whose page blocks
  scripts; the paper itself was confirmed through Crossref. The place is given as Lisowice.
- **Saturnalia's name meaning** was cited to the 1999 description, which nobody could open. It now
  says only "Saturnalia, a Roman festival", sourced to Britannica, with no claim about why it was
  chosen.
- **Hatzegopteryx's name meaning** rests on a blog that quotes the 2002 paper; the paper itself is
  paywalled. Flagged here for a better source.
- **Some papers were read only as abstracts** because publishers block scripts. Claims cited to them
  come only from those abstracts. These are Curry Rogers & Forster 2001, Curry Rogers 2016, Buffetaut
  2002, Soto-Acuña 2021 and Brown 2017.
- **Naming years:** Centrosaurus 1905 (PBDB; literature often says 1904), Hypsilophodon 1870 (PBDB;
  NHM 1869), Deinocheirus "Osmólska & Roniewicz 1970" with Kielan-Jaworowska 1969 in the note.
- **Anchiornis** is under avialae following Pei et al. 2017; PBDB and its describers say troodontid.
  Flagged.

## Fixes made in checking

- **Search:** "stego" ranked Stegoceras above Stegosaurus. Well-known species now win ties.
- **Phone timeline:** opening a species the timeline hides (e.g. Pteranodon) shows Sinosauropteryx's
  window, but no longer leaves its lane scrolled off to the side. New Yixian species had pushed it to the
  second lane.
- An e2e test now opens Allosaurus by keyboard focus, which scrolls its lane into view on a phone.

## Images

All 21 credited (CC0, CC BY, CC BY-SA, one public domain). Lisowicia is a restoration based on the 2019
description, and Silesaurus a life-size model at JuraPark Krasiejów. Borealopelta is the real fossil.

Weak as main images, kept because the alternatives were worse: **Anchiornis** (a cracked holotype slab
behind a label; the best restoration is in Commons' "inaccurate models" category), **Rapetosaurus**
(Apatosaurus legs in the foreground; the other photo is more cluttered), **Rajasaurus** (a skull replica
in a case), **Magyarosaurus** (a plain grey outline), **Deinocheirus** (visitors' heads along the
bottom).

## For the owner

1. **Silesaurus:** keep it as "not a dinosaur" (flagged), or follow PBDB and file it as an
   ornithischian dinosaur?
2. **Group nodes wished for:** tyrannosauroidea (Guanlong, Yutyrannus), nodosauridae (Borealopelta),
   ceratopsidae (Centrosaurus, Chasmosaurus), troodontidae, saltasauridae.
3. **Batch 4:** 5 or more species to pass 100, then the end-of-phase QA and review.

# Phase 6, batch 1: 20 new species (34 → 54)

Researched by two `paleo-content-curator` agents, images chosen by `media-curator`, every record in
English and Polish. `pnpm validate:data` passes: 54 species, 54 credited images, Polish everywhere.
Every DOI was checked against Crossref (title and year) and every PBDB taxon number against the
PBDB API.

## Records

| Species                        | Species used   | Lived (Ma)    | Length (m) | Mass       | Diet      | Group in our tree   |
| ------------------------------ | -------------- | ------------- | ---------- | ---------- | --------- | ------------------- |
| Cryolophosaurus                | C. ellioti     | 199.5–184.2   | 6.5–8      | 465–500 kg | carnivore | theropoda ⚑         |
| Ceratosaurus                   | C. nasicornis  | 154.8–143.1   | 6–7        | 980 kg     | carnivore | ceratosauria        |
| Megalosaurus                   | M. bucklandii  | 168.2–165.3   | 6          | — ⚑        | carnivore | tetanurae           |
| Giganotosaurus                 | G. carolinii   | 100–95 ⚑      | 13         | 13.8 t     | carnivore | allosauroidea       |
| Deinonychus                    | D. antirrhopus | 124–98 ⚑      | 3.4        | 100 kg     | carnivore | dromaeosauridae     |
| Utahraptor                     | U. ostrommaysi | 137.05–132.6  | 5.5        | 350 kg     | carnivore | dromaeosauridae     |
| Albertosaurus                  | A. sarcophagus | 73.1–68       | 9          | 1.5 t      | carnivore | tyrannosauridae     |
| Apatosaurus                    | A. ajax        | 154.8–143.1   | 21         | — ⚑        | herbivore | diplodocidae        |
| Camarasaurus                   | C. supremus    | 154.8–143.1   | 23         | 20 t       | herbivore | sauropoda           |
| Giraffatitan                   | G. brancai     | 161.5–143.1   | 23         | 23.2 t     | herbivore | brachiosauridae     |
| Edmontosaurus                  | E. regalis     | 73.1–71.5 ⚑   | 13         | 3.4 t      | herbivore | hadrosauridae       |
| Lambeosaurus                   | L. lambei      | 76–74 ⚑       | 9          | — ⚑        | herbivore | hadrosauridae       |
| Corythosaurus                  | C. casuarius   | 76–74 ⚑       | 10         | — ⚑        | herbivore | hadrosauridae       |
| Muttaburrasaurus               | M. langdoni    | 110–100 ⚑     | 7–8        | — ⚑        | herbivore | ornithopoda         |
| Styracosaurus                  | S. albertensis | 76–75 ⚑       | 5.5        | 2.7 t      | herbivore | ceratopsia          |
| Protoceratops                  | P. andrewsi    | 74–70 ⚑       | 1.8        | 400 kg     | herbivore | ceratopsia          |
| Kentrosaurus                   | K. aethiopicus | 154.8–143.1 ⚑ | 5          | — ⚑        | herbivore | stegosauria         |
| Scelidosaurus                  | S. harrisonii  | 199.5–192.9   | 4–4.4      | — ⚑        | herbivore | thyreophora         |
| Euoplocephalus                 | E. tutus       | 76–72.2 ⚑     | 7          | 2 t        | herbivore | ankylosauria        |
| Ichthyosaurus (not a dinosaur) | I. communis    | 201.4–192.9   | 2          | — ⚑        | carnivore | ichthyosauria (new) |

⚑ = left empty or flagged `uncertain`, with a note in the record. Many sizes rest on a single
museum figure (NHM Dino Directory), and the notes say so. Several time ranges are stage-level
PBDB dates (noted); only Albertosaurus, Edmontosaurus and Deinonychus use radiometric formation
dates.

## Notable choices

- **Deinonychus 124–98 Ma** is the U-Pb age span of the two Cloverly members it is recorded from,
  not the age of the fossils; NHM gives 115–108 Ma. Noted in the record.
- **Giganotosaurus** uses NHM's 100–95 Ma (Cenomanian); PBDB dates it to the Albian. No
  radiometric date for the Candeleros Formation could be verified. Flagged.
- **Scelidosaurus** uses the Sinemurian (Norman 2020, PBDB), not NHM's 208–194 Ma, which would
  reach into the Triassic. Named 1861 (PBDB, Norman), not NHM's 1868.
- **Albertosaurus**: NHM's page names the type species "libratus" (an error), so its 9 m / 1.5 t
  may not refer to _A. sarcophagus_; noted.
- **Edmontosaurus** is the type species _E. regalis_; the famous Hell Creek skeletons are
  _E. annectens_, which the taxonomy note explains.
- **Locations**: unconfirmed country records left out (Styracosaurus USA; Protoceratops China,
  whose Chinese records are _P. hellenikorhinus_; Ichthyosaurus outside Great Britain).
  Ceratosaurus includes Portugal from one PBDB specimen filed under _C. nasicornis_.

## Images

All 20 credited (CC BY, CC BY-SA). Four show another species of the same genus, with a visible
note: Edmontosaurus (_E. annectens_), Apatosaurus (_A. louisae_), Corythosaurus
(_C. intermedius_), Camarasaurus (_C. lentus_). Giraffatitan carries a note that the museum
displays it under its earlier name, Brachiosaurus.

Weak as main images: **Euoplocephalus** is a fossil pelvis (every mount on Commons is filed as
_Scolosaurus_, so none could be used honestly), **Giraffatitan** shows only the neck and head from
below, and **Ichthyosaurus** is a case of several fossils.

## For the owner

1. **Group nodes**: add `megalosauroidea` (Megalosaurus) and `macronaria`/`camarasauridae`
   (Camarasaurus) to the tree? Muttaburrasaurus (iguanodontian per NHM) sits at `ornithopoda` and
   Scelidosaurus (possibly a stem ankylosaur) at `thyreophora` because the finer placement wasn't
   verified. Cryolophosaurus is at `theropoda`: its placement is debated (flagged).
2. **Ceratosaurus in Portugal**: keep, or list only species-level records?
3. **Giganotosaurus age**: keep NHM's 100–95 Ma (flagged) until a radiometric date is verified?
4. **Access dates**: the research spanned 21–22 November because of a usage pause; each source
   keeps the date it was actually opened.

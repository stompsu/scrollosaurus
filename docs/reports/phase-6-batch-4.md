# Phase 6, batch 4: 8 new species (95 → 103), and a mass cross-check

Researched by `paleo-content-curator`, images chosen by `media-curator`, every record in English and
Polish. `pnpm validate:data` passes: 103 species, 103 credited images. All 21 DOIs match Crossref, all
24 other links open, and every PBDB taxon number matches.

## Records

| Species                      | Species used     | Lived (Ma)    | Length (m)        | Mass      | Diet      | Group in our tree |
| ---------------------------- | ---------------- | ------------- | ----------------- | --------- | --------- | ----------------- |
| Carcharodontosaurus          | C. saharicus     | 100.5–93.9    | 12–13             | — ⚑       | carnivore | allosauroidea     |
| Concavenator                 | C. corcovatus    | 125.8–121.4 ⚑ | 6                 | — ⚑       | carnivore | allosauroidea     |
| Ornithomimus                 | O. edmontonicus  | 73.1–68 ⚑     | 4                 | — ⚑       | omnivore  | ornithomimosauria |
| Brachylophosaurus            | B. canadensis    | 79.5–77.8 ⚑   | 7                 | — ⚑       | herbivore | hadrosauridae     |
| Dreadnoughtus                | D. schrani       | 83.6–66 ⚑     | 26                | 22–59 t ⚑ | herbivore | titanosauria      |
| Leaellynasaura               | L. amicagraphica | 113.2–110.1   | — ⚑               | — ⚑       | herbivore | ornithopoda ⚑     |
| Kunbarrasaurus               | K. ieversi       | 106.3–100.5   | — ⚑               | — ⚑       | herbivore | ankylosauria      |
| Dimorphodon (not a dinosaur) | D. macronyx      | 201.4–192.9 ⚑ | — (span 1.4–1.45) | — ⚑       | carnivore | pterosauria       |

⚑ = left empty or flagged `uncertain`, with a note in the record.

## Notable choices

- **Dreadnoughtus mass** spans Bates et al. 2015's lowest volume model (22 t) to the describers' 59 t,
  which Bates et al. call highly implausible; the note says so.
- **Carcharodontosaurus:** only the Moroccan Kem Kem records are listed. The Egyptian skeleton is now
  _Tameryraptor_ (Kellermann et al. 2025); NHM's "Algeria, Egypt" is noted.
- **Ornithomimus:** _O. edmontonicus_ (the Alberta material) rather than the type species _O. velox_;
  the note explains, and whether both belong in one genus is flagged.
- **Brachylophosaurus:** NHM's 89–88 Ma is wrong; the record brackets it at 79.5–77.8 Ma from dated
  neighbouring rocks. The "Leonardo" mummy's leaf gut contents are tied to specimen JRF 115 (Tweet et
  al. 2008).
- **Kunbarrasaurus** was first described as _Minmi_; the image note says so.
- **Claims resting only on abstracts:** Ortega et al. 2010 (Concavenator's length and the disputed quill
  knobs), Zelenitsky et al. 2012, Eberth & Kamo 2020, Tweet et al. 2008 and 2016, Ibrahim et al. 2020.

## Mass cross-check (existing records)

Ten records now cite Benson et al. 2014 (PLOS Biology, Table 1; limb-bone scaling). Kentrosaurus
(1.6 t) and Stegoceras (16 kg) gained a mass. Where a museum figure disagrees, the range spans both
with a note on each: Giganotosaurus 6.1–13.8 t, Ankylosaurus 4.8–8 t, Centrosaurus 1–2.5 t,
Edmontosaurus 3.4–7.6 t, Triceratops 10–14 t, Magyarosaurus 750–900 kg, Argentinosaurus 60–90 t.
Differences of 1.5× or more are flagged.

## Owner requests handled this round

- **Pachycephalosaurus:** two-legged, dome-headed outline; a real skull photo (AMNH 1696) instead of a
  mostly reconstructed cast; mass 370–450 kg (Benson et al. 2014; NHM); length stays 3 m, flagged, as no
  peer-reviewed length exists; Canada added (PBDB).
- **Sinosauropteryx and insects:** "it may also have eaten insects", cited to Qiu et al. 2025, whose
  argument from its slender jaws and weak neck muscles is quoted in the diet note. No insect remains
  have been found, so the diet stays carnivore.
- **Reference person:** the head floated above the body (and made the figure look about 2 m tall);
  it now sits on a neck.

## Images

All 8 credited. Weak but honest: **Dreadnoughtus** (a composite of the fossil tail; no mount photo on
Commons) and **Leaellynasaura** (the holotype jaw fragment). The credit cleaner now turns
"Photographer: X Source: Y" into "X, Y".

## For the owner

1. **Leaellynasaura** sits under ornithopoda (NHM); PBDB puts it in Elasmaria. Keep, or file it under
   the broader ornithischia?
2. Phase 6 now has 103 species. Next: the end-of-phase QA, accessibility and performance audit, code
   review and Lighthouse, then the pull request.

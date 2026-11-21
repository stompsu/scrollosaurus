# ADR-0002: Data and licensing policy

- **Status:** Accepted (2026-11-20)
- **Deciders:** project owner, Claude (lead engineer)

## Context

Scrollosaurus is an educational app. Its value depends on being right and on respecting the people whose work it shows. Content is curated by hand (partly with AI help), so honesty and licensing must be enforced by the build rather than by goodwill.

## Decision

### 1. Every fact has a source

- Every species record has a non-empty `sources` list (`title`, `url`, `accessed` date) and a `lastReviewed` date.
- Preferred sources, in order: peer-reviewed papers (with DOI), museum and university pages, the Paleobiology Database (PBDB). Wikipedia is only a pointer to primary sources and is never the sole source for a number.
- Numeric values (time ranges, length, mass, height) are taken from a cited source and stored as **ranges** (`[min, max]`) where estimates vary.
- Time ranges are the **first and last appearance in the fossil record**, in Ma, consistent with the ICS chart recorded in `data/geologic-time.json`.

### 2. Uncertainty is explicit, never guessed

- If a value cannot be verified, the field is **left empty** and the record is listed in the phase's uncertainties report. It is never filled with an estimate of our own.
- Diet has `dietConfidence`: `established`, `probable` or `debated`. `diet: "uncertain"` is allowed.
- Time ranges can carry `uncertaintyMa`. Dubious or synonymised genera are noted.
- The UI shows uncertainty (e.g. "debated", "~") rather than hiding it.

### 3. Geological time

- Boundaries come only from the latest ICS International Chronostratigraphic Chart. The chart version, URL, citation and access date are stored in `data/geologic-time.json` (currently **v2024/12**).
- Components never hard-code dates. When ICS publishes a new chart, update the file and re-check species ranges against it.

### 4. Image licensing

- Allowed licences: **Public Domain, CC0, CC BY, CC BY-SA** (any version). Rejected: NC, ND, "fair use", all-rights-reserved, unclear or missing licences.
- Source: mainly Wikimedia Commons. Species files hold only the chosen Commons file, its kind and alt text. Credit metadata (author, licence, licence URL, source URL) is fetched from the Commons API by the Phase 4 pipeline into a generated file under `data/generated/`, never typed by hand, and validated there.
- Public-domain files sometimes have no licence URL on Commons; for those the credit links the Commons file page, which states the public-domain reason. Every other licence needs its licence URL.
- The optimised copies (AVIF and WebP at up to 320/640/1280 px) and `data/generated/images.json` are committed, so builds and deploys never depend on Commons being reachable (owner decision, Phase 4). Originals are not committed; the pipeline downloads a 1280 px rendering into a cache outside git. It identifies itself to Wikimedia as "Scrollosaurus image pipeline" with the public repository URL.
- A species with no acceptable image ships without one ("No image yet") and is listed on `/credits`; no outdated or unlicensed image is used to fill the gap (owner decision, Phase 4).
- Every image is credited in the UI next to the image and on `/credits`. Attribution is never stripped. CC BY-SA derivatives (resized/converted files) keep the same licence.
- Prefer fossils and skeleton mounts, then scientifically reviewed life reconstructions. Outdated reconstructions appear only when labelled as historical.
- Images are self-hosted (downloaded and optimised at build time), not hotlinked.

### 5. Translations

Translatable text (name meanings, summaries, fun facts, alt text) sits inline in each record as `{ en, pl }`, not in separate `data/i18n/` files as the kickoff sketched: a record and its translations change together. `data/i18n/{en,pl}/` is kept for UI strings (Phase 6). Polish is deferred to Phase 6 by the owner's decision; until then `pl` is optional and the validator warns once while it is missing.

### 6. Non-dinosaurs

Pterosaurs, plesiosaurs, ichthyosaurs and mosasaurs have `isDinosaur: false`, live in a separate layer that is off by default, and are labelled "not a dinosaur".

### 7. Enforcement: the build fails when

`pnpm validate:data` runs before every build and in CI. It fails if:

- any data file doesn't match its Zod schema (unknown fields are rejected);
- geological units overlap, leave gaps, or fall outside their parent;
- a species has no sources, no `lastReviewed`, a claim citing a source id it doesn't list, a time range that falls outside the Mesozoic or disagrees with its listed periods, an unknown group, or an `isDinosaur` that disagrees with its group;
- the primary species in `data/site.json` has no species file;
- an image listed by a species has no entry in `data/generated/images.json`, lacks author, licence or source URL, lacks a licence URL without being public domain, has a licence outside the allowed list, or is missing one of its derivative files.

It warns (without failing) when a length or mass is empty but not listed in `uncertain`, when a listed source is cited by no field, while Polish text is missing, when a species has no image, and when a credit is no longer used.

### 8. Licensing of our own content

The geological chart is © ICS, CC BY 4.0, credited on `/credits`. The licence for Scrollosaurus's own code and texts is still to be chosen (open question for the owner).

## Rejected alternatives

- **Trusting manual review alone:** doesn't scale to 100+ species and misses regressions.
- **Allowing NC images:** would restrict how the site can be shared or used and complicates any future change of use.
- **Single-value sizes:** hides real scientific disagreement and invites false precision.

## Consequences

- Adding a species takes more effort (sources, ranges, review), which is intended.
- Some species may launch with empty fields or without images. That is better than wrong data.

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
- Source: mainly Wikimedia Commons. Metadata (author, licence, licence URL, source URL) is fetched from the Commons API, not typed by hand, and stored with each image.
- Every image is credited in the UI next to the image and on `/credits`. Attribution is never stripped. CC BY-SA derivatives (resized/converted files) keep the same licence.
- Prefer fossils and skeleton mounts, then scientifically reviewed life reconstructions. Outdated reconstructions appear only when labelled as historical.
- Images are self-hosted (downloaded and optimised at build time), not hotlinked.

### 5. Non-dinosaurs

Pterosaurs, plesiosaurs, ichthyosaurs and mosasaurs have `isDinosaur: false`, live in a separate layer that is off by default, and are labelled "not a dinosaur".

### 6. Enforcement: the build fails when

`pnpm validate:data` runs before every build and in CI. It fails if:

- any data file doesn't match its Zod schema (unknown fields are rejected);
- geological units overlap, leave gaps, or fall outside their parent;
- a species has no sources, no `lastReviewed`, or a time range that falls outside the Mesozoic or disagrees with its listed periods;
- an image lacks author, licence, licence URL or source URL, or has a licence outside the allowed list.

(Species and image checks are added with their schemas in Phases 1 and 4.)

### 7. Licensing of our own content

The geological chart is © ICS, CC BY 4.0, credited on `/credits`. The licence for Scrollosaurus's own code and texts is still to be chosen (open question for the owner).

## Rejected alternatives

- **Trusting manual review alone:** doesn't scale to 100+ species and misses regressions.
- **Allowing NC images:** would restrict how the site can be shared or used and complicates any future change of use.
- **Single-value sizes:** hides real scientific disagreement and invites false precision.

## Consequences

- Adding a species takes more effort (sources, ranges, review), which is intended.
- Some species may launch with empty fields or without images. That is better than wrong data.

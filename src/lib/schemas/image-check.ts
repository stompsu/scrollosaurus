import { classifyLicense, deedMatches } from '../image-credits.ts';
import { IMAGE_FORMATS, type ImageManifest } from './images.ts';

export interface ImageCheckInput {
  /** Commons file → slugs of the species that list it. */
  listed: ReadonlyMap<string, readonly string[]>;
  manifest: ImageManifest;
  /** Paths that exist under public/, e.g. "images/1a2b3c4d5e6f-320.webp". */
  publicFiles: ReadonlySet<string>;
}

/**
 * Fails when a listed image has no credit, a credit fails the licence policy again (in case the
 * file was edited by hand), or a derivative file is missing. Warns about unused manifest entries.
 */
export function checkImages({ listed, manifest, publicFiles }: ImageCheckInput): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const [file, slugs] of listed) {
    const at = `${file} (${slugs.join(', ')})`;
    const entry = manifest[file];
    if (!entry) {
      errors.push(`${at}: no credit in data/generated/images.json; run \`pnpm images\``);
      continue;
    }
    if (classifyLicense(entry.license) !== entry.licenseFamily) {
      errors.push(`${at}: licence "${entry.license}" is not allowed or doesn't match its family`);
    }
    if (!deedMatches(entry.licenseFamily, entry.licenseUrl)) {
      errors.push(`${at}: licence URL doesn't point to the ${entry.licenseFamily} deed`);
    }
    for (const w of entry.widths) {
      for (const format of IMAGE_FORMATS) {
        const path = `${entry.basename}-${String(w)}.${format}`;
        if (!publicFiles.has(path))
          errors.push(`${at}: missing public/${path}; run \`pnpm images\``);
      }
    }
  }
  for (const file of Object.keys(manifest)) {
    if (!listed.has(file)) warnings.push(`${file}: in images.json but no species lists it`);
  }
  return { errors, warnings };
}

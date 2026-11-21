import type { LicenseFamily } from './schemas/images';

/**
 * Turns a Commons licence name into one of the allowed families (ADR-0002 §4), or undefined if it
 * isn't allowed: NC, ND, GFDL-only, fair use and anything unrecognised are rejected.
 */
export function classifyLicense(shortName: string): LicenseFamily | undefined {
  const s = shortName
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
  if (/\b(nc|nd)\b|non-?commercial|no-?deriv|fair use/.test(s.replace(/-/g, ' '))) return undefined;
  if (/^(public domain|pd)\b/.test(s)) return 'public-domain';
  if (/^cc0\b/.test(s) || s.startsWith('cc zero')) return 'cc0';
  if (/^cc[ -]by[ -]sa\b/.test(s)) return 'cc-by-sa';
  if (/^cc[ -]by\b/.test(s)) return 'cc-by';
  return undefined;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Plain text from a Commons metadata HTML snippet: tags removed, entities decoded, spaces collapsed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        return String.fromCodePoint(parseInt(code.slice(2), 16));
      }
      if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** The fields of Commons `extmetadata` the pipeline reads. Each is `{ value: string }`. */
export interface CommonsExtMetadata {
  Artist?: { value: string };
  Attribution?: { value: string };
  LicenseShortName?: { value: string };
  LicenseUrl?: { value: string };
}

export interface ParsedCredit {
  author: string;
  attribution?: string;
  license: string;
  licenseFamily: LicenseFamily;
  licenseUrl?: string;
}

/** Credit fields from Commons metadata, or a reason it can't be used. */
export function parseCredit(meta: CommonsExtMetadata): ParsedCredit | { error: string } {
  const license = htmlToText(meta.LicenseShortName?.value ?? '');
  if (!license) return { error: 'no licence' };
  const licenseFamily = classifyLicense(license);
  if (!licenseFamily) return { error: `licence "${license}" is not allowed` };
  const author = htmlToText(meta.Artist?.value ?? '');
  if (!author) return { error: 'no author' };
  const rawUrl = (meta.LicenseUrl?.value ?? '').trim().replace(/^http:\/\//, 'https://');
  const licenseUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  if (!licenseUrl && licenseFamily !== 'public-domain') return { error: 'no licence URL' };
  const attribution = htmlToText(meta.Attribution?.value ?? '');
  return {
    author,
    license,
    licenseFamily,
    ...(licenseUrl ? { licenseUrl } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

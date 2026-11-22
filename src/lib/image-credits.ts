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
  // Any NC or ND element (also run together, as in "BY-NCSA") rules a licence out.
  if (/\b(nc|nd)|non-?commercial|no-?deriv|fair use/.test(s.replace(/-/g, ' '))) return undefined;
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
      if (code.startsWith('#')) {
        const hex = code[1] === 'x' || code[1] === 'X';
        const point = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Author name for display: contact details some uploaders add to their name (an email address,
 * links in brackets) are dropped. The Commons page, which the credit links, keeps them.
 */
export function cleanAuthor(author: string): string {
  return (
    author
      // "Photographer: A. Name Source: Some Museum" → "A. Name, Some Museum".
      .replace(/^\s*(?:photographer|photo|author|artist)\s*:\s*/i, '')
      .replace(/\s+source\s*:\s*/i, ', ')
      .replace(/\(([^()]*)\)/g, (m, inner: string) =>
        /^[\s;,]*((https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.]+)([\s;,]+((https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.]+))*[\s;,]*$/.test(
          inner,
        )
          ? ''
          : m,
      )
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,;])/g, '$1')
      .trim()
      .replace(/[\s,;]+$/, '')
  );
}

/** The licence deed a family's URL must point to. Public domain has no fixed deed. */
const DEED: Record<LicenseFamily, RegExp | undefined> = {
  'public-domain': undefined,
  cc0: /^https:\/\/creativecommons\.org\/publicdomain\/zero\//,
  'cc-by': /^https:\/\/creativecommons\.org\/licenses\/by\/\d/,
  'cc-by-sa': /^https:\/\/creativecommons\.org\/licenses\/by-sa\/\d/,
};

/** Whether a licence URL is the deed for its family (any URL is accepted for public domain). */
export function deedMatches(family: LicenseFamily, url: string | undefined): boolean {
  const deed = DEED[family];
  return deed === undefined || (url !== undefined && deed.test(url));
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
  const author = cleanAuthor(htmlToText(meta.Artist?.value ?? ''));
  if (!author) return { error: 'no author' };
  const rawUrl = (meta.LicenseUrl?.value ?? '').trim().replace(/^http:\/\//, 'https://');
  const licenseUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  if (!licenseUrl && licenseFamily !== 'public-domain') return { error: 'no licence URL' };
  if (licenseUrl && !deedMatches(licenseFamily, licenseUrl)) {
    return { error: `licence URL ${licenseUrl} doesn't match "${license}"` };
  }
  const attribution = htmlToText(meta.Attribution?.value ?? '');
  return {
    author,
    license,
    licenseFamily,
    ...(licenseUrl ? { licenseUrl } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

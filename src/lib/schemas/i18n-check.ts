/**
 * Build-time checks for the UI strings in `data/i18n/{en,pl}`: the two languages have the same keys
 * (Polish may add plural forms English doesn't have), the same `{{placeholders}}`, no empty strings,
 * and every geological unit has a Polish name.
 */

type Strings = Record<string, unknown>;

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** "a.b.c" → string for every leaf; non-string leaves are reported as errors by the caller. */
function flatten(
  obj: Strings,
  prefix = '',
  out = new Map<string, unknown>(),
): Map<string, unknown> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v as Strings, key, out);
    else out.set(key, v);
  }
  return out;
}

const base = (key: string) => key.replace(PLURAL_SUFFIX, '');

function placeholders(text: string): string {
  return [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((m) => m[1] ?? '')
    .filter((name) => name !== 'count')
    .sort()
    .join(',');
}

export function checkTranslations(
  en: Strings,
  pl: Strings,
  geologyPl: Strings,
  unitIds: readonly string[],
): string[] {
  const errors: string[] = [];
  const enKeys = flatten(en);
  const plKeys = flatten(pl);
  const enBases = new Set([...enKeys.keys()].map(base));
  const plBases = new Set([...plKeys.keys()].map(base));

  for (const [file, keys] of [
    ['en', enKeys],
    ['pl', plKeys],
  ] as const) {
    for (const [key, value] of keys) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`i18n/${file}/common.json: "${key}" must be a non-empty string`);
      }
    }
  }
  for (const b of enBases) {
    if (!plBases.has(b)) errors.push(`i18n/pl/common.json: missing "${b}"`);
  }
  for (const b of plBases) {
    if (!enBases.has(b)) errors.push(`i18n/pl/common.json: "${b}" has no English original`);
  }
  // Placeholders must match, comparing each Polish string with the English one of the same key,
  // or for a plural form English lacks, with English's "_other" (or bare) form.
  for (const [key, value] of plKeys) {
    if (typeof value !== 'string') continue;
    const original = enKeys.get(key) ?? enKeys.get(`${base(key)}_other`) ?? enKeys.get(base(key));
    if (typeof original !== 'string') continue;
    if (placeholders(value) !== placeholders(original)) {
      errors.push(
        `i18n/pl/common.json: "${key}" uses {{${placeholders(value)}}} but English uses {{${placeholders(original)}}}`,
      );
    }
  }

  const named = new Set(Object.keys(geologyPl));
  for (const id of unitIds) {
    const name = geologyPl[id];
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push(`i18n/pl/geology.json: no Polish name for unit "${id}"`);
    }
    named.delete(id);
  }
  for (const id of named) errors.push(`i18n/pl/geology.json: "${id}" is not a unit in the chart`);
  return errors;
}

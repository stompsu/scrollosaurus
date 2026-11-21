/**
 * Size classes for the size filter, by body length. These are display buckets chosen for the app
 * (approved by the owner for Phase 3), not scientific categories. See docs/data-guidelines.md.
 */
export const SIZE_CLASSES = [
  { id: 'small', label: 'Small', description: 'under 2 m', minM: 0, maxM: 2 },
  { id: 'medium', label: 'Medium', description: '2 to 6 m', minM: 2, maxM: 6 },
  { id: 'large', label: 'Large', description: '6 to 12 m', minM: 6, maxM: 12 },
  { id: 'giant', label: 'Giant', description: '12 m or more', minM: 12, maxM: Infinity },
] as const;

export type SizeClass = (typeof SIZE_CLASSES)[number]['id'];

/** The filter value for species with no recorded length. */
export const SIZE_UNKNOWN = 'unknown';
export type SizeFilter = SizeClass | typeof SIZE_UNKNOWN;

/**
 * Every class a length range touches, so a disputed size is never forced into one bucket: a
 * Plateosaurus at 4.8–10 m is both medium and large. A class covers [minM, maxM). No length → [].
 */
export function sizeClassesFor(lengthM: readonly [number, number] | undefined): SizeClass[] {
  if (!lengthM) return [];
  const [lo, hi] = lengthM;
  return SIZE_CLASSES.filter((c) => lo < c.maxM && hi >= c.minM).map((c) => c.id);
}

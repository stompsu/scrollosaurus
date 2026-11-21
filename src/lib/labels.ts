import type { Continent, Diet, PeriodId, Species } from './schemas/species';

/** English UI labels for data enums. Polish arrives with i18next in Phase 6. */
export const DIET_LABELS: Record<Diet, { label: string; hint?: string }> = {
  carnivore: { label: 'Carnivore', hint: 'predator' },
  herbivore: { label: 'Herbivore', hint: 'plant-eater' },
  omnivore: { label: 'Omnivore', hint: 'plants and animals' },
  piscivore: { label: 'Piscivore', hint: 'fish-eater' },
  insectivore: { label: 'Insectivore', hint: 'insect-eater' },
  uncertain: { label: 'Diet uncertain' },
};

export const DIET_CONFIDENCE_LABELS: Record<Species['diet']['confidence'], string | undefined> = {
  established: undefined,
  probable: 'probable',
  debated: 'debated',
};

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: 'Africa',
  antarctica: 'Antarctica',
  asia: 'Asia',
  australia: 'Australia',
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
};

export const PERIOD_LABELS: Record<PeriodId, string> = {
  triassic: 'Triassic',
  jurassic: 'Jurassic',
  cretaceous: 'Cretaceous',
};

export const NOT_A_DINOSAUR = 'not a dinosaur';

const regionNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : undefined;

/** Country name from an ISO 3166-1 alpha-2 code, e.g. "CN" → "China". */
export function countryName(code: string): string {
  return regionNames?.of(code) ?? code;
}

/** "1.1 m", "4.8–10 m": a [min, max] range with a unit. */
export function formatRange(value: readonly [number, number], unit: string): string {
  const fmt = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 2 });
  const [lo, hi] = value;
  return lo === hi ? `${fmt(lo)} ${unit}` : `${fmt(lo)}–${fmt(hi)} ${unit}`;
}

/** Mass in kg or tonnes: [450, 450] → "450 kg", [4000, 15000] → "4–15 t". */
export function formatMass(value: readonly [number, number]): string {
  return value[1] >= 1000
    ? formatRange([value[0] / 1000, value[1] / 1000], 't')
    : formatRange(value, 'kg');
}

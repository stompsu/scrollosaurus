/**
 * Data enums shared by the schemas (build time) and the UI (browser). Kept free of Zod so the
 * browser bundle doesn't pull in the schema library just for these lists.
 */
export const DIETS = [
  'carnivore',
  'herbivore',
  'omnivore',
  'piscivore',
  'insectivore',
  'uncertain',
] as const;
export type Diet = (typeof DIETS)[number];

export const CONTINENTS = [
  'africa',
  'antarctica',
  'asia',
  'australia',
  'europe',
  'north-america',
  'south-america',
] as const;
export type Continent = (typeof CONTINENTS)[number];

export const PERIOD_IDS = ['triassic', 'jurassic', 'cretaceous'] as const;
export type PeriodId = (typeof PERIOD_IDS)[number];

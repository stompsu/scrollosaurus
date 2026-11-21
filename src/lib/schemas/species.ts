import { z } from 'zod';
import { localizedTextSchema, slugSchema, sourceIdsSchema, sourceSchema } from './common';

export const DIETS = [
  'carnivore',
  'herbivore',
  'omnivore',
  'piscivore',
  'insectivore',
  'uncertain',
] as const;
export const dietSchema = z.enum(DIETS);
export type Diet = z.infer<typeof dietSchema>;

export const CONTINENTS = [
  'africa',
  'antarctica',
  'asia',
  'australia',
  'europe',
  'north-america',
  'south-america',
] as const;
export const continentSchema = z.enum(CONTINENTS);
export type Continent = z.infer<typeof continentSchema>;

export const PERIOD_IDS = ['triassic', 'jurassic', 'cretaceous'] as const;
export const periodIdSchema = z.enum(PERIOD_IDS);
export type PeriodId = z.infer<typeof periodIdSchema>;

/** Fields that can be flagged in `uncertain`. Keep in sync with the record shape below. */
export const UNCERTAIN_FIELDS = [
  'timeRange',
  'size.lengthM',
  'size.massKg',
  'size.heightM',
  'size.wingspanM',
  'diet',
  'locations',
  'discovery',
  'group',
  'taxonomy',
] as const;

/** [min, max] where min <= max. A single published value is stored as [v, v]. */
const rangeSchema = z
  .tuple([z.number().positive(), z.number().positive()])
  .refine(([min, max]) => min <= max, { message: 'Range min must be <= max' });

const measuredSchema = z
  .object({
    value: rangeSchema,
    sourceIds: sourceIdsSchema,
    note: z.string().trim().min(1).optional(),
  })
  .strict();

/**
 * First and last appearance in the fossil record, in Ma. `startMa` is the older (larger) value.
 * The uncertainties are ± values for each end, when the source gives them.
 */
export const timeRangeSchema = z
  .object({
    startMa: z.number().positive(),
    startUncertaintyMa: z.number().positive().optional(),
    endMa: z.number().positive(),
    endUncertaintyMa: z.number().positive().optional(),
    sourceIds: sourceIdsSchema,
    note: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((t) => t.startMa >= t.endMa, { message: 'startMa (older) must be >= endMa (younger)' });

/**
 * Hand-written image choice. Credits (author, licence, URLs) are fetched from Commons by the
 * Phase 4 pipeline into a generated file and validated there, never typed by hand (ADR-0002).
 */
const imageSchema = z
  .object({
    commonsFile: z.string().regex(/^File:.+\.(jpe?g|png|svg|tiff?|webp)$/i),
    kind: z.enum(['fossil', 'skeleton-mount', 'life-reconstruction', 'skull']),
    alt: localizedTextSchema,
  })
  .strict();

/** ISO 3166-1 alpha-2 code, rendered in the UI language with Intl.DisplayNames. */
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'Use an ISO 3166-1 alpha-2 country code');

const wordCount = (text: string): number => text.split(/\s+/).length;

export const speciesSchema = z
  .object({
    slug: slugSchema,
    scientificName: z.string().trim().min(1),
    genus: z.string().regex(/^[A-Z][a-z]+$/, 'Genus is one capitalised word'),
    nameMeaning: z.object({ text: localizedTextSchema, sourceIds: sourceIdsSchema }).strict(),
    /** Most specific node in data/groups.json; `groupSourceIds` support the placement. */
    group: slugSchema,
    groupSourceIds: sourceIdsSchema,
    isDinosaur: z.boolean(),
    taxonomy: z
      .object({
        status: z.enum(['valid', 'dubious', 'contested']),
        note: z.string().trim().min(1).optional(),
        sourceIds: sourceIdsSchema.optional(),
      })
      .strict()
      .refine((t) => t.status === 'valid' || (t.note !== undefined && t.sourceIds !== undefined), {
        message: 'A dubious or contested genus needs a note and sourceIds',
      }),
    diet: z
      .object({
        value: dietSchema,
        confidence: z.enum(['established', 'probable', 'debated']),
        sourceIds: sourceIdsSchema,
        note: z.string().trim().min(1).optional(),
      })
      .strict()
      .refine((d) => d.confidence !== 'debated' || d.note !== undefined, {
        message: 'A debated diet needs a note',
      }),
    timeRange: timeRangeSchema,
    /** Derived from timeRange; checked against data/geologic-time.json by validate:data. */
    periods: z.array(periodIdSchema).min(1),
    size: z
      .object({
        lengthM: measuredSchema.optional(),
        massKg: measuredSchema.optional(),
        heightM: measuredSchema.optional(),
        /** Wing tip to wing tip, for flying animals (pterosaurs). */
        wingspanM: measuredSchema.optional(),
      })
      .strict(),
    locations: z
      .array(
        z
          .object({
            continent: continentSchema,
            countryCode: countryCodeSchema,
            /** Formation name as the source spells it, without "Formation" (e.g. "Hell Creek"). */
            formation: z.string().trim().min(1).optional(),
            sourceIds: sourceIdsSchema,
          })
          .strict(),
      )
      .min(1),
    discovery: z
      .object({
        /** Surnames only, joined with " & " (e.g. "Ji & Ji", "Horner & Makela"). */
        describedBy: z
          .string()
          .trim()
          .min(1)
          .refine((v) => !/[()]/.test(v), { message: 'Put history in discovery.note' }),
        year: z.number().int().min(1800).max(2100),
        /** Naming history, e.g. the original genus the species was described in. */
        note: z.string().trim().min(1).optional(),
        sourceIds: sourceIdsSchema,
      })
      .strict(),
    /** Every claim in the summary must be supported by the cited sources. */
    summary: z
      .object({
        text: localizedTextSchema.refine(
          (t) => wordCount(t.en) <= 80 && (t.pl === undefined || wordCount(t.pl) <= 80),
          { message: 'Summary must be 80 words or fewer' },
        ),
        sourceIds: sourceIdsSchema,
      })
      .strict(),
    funFacts: z
      .array(z.object({ text: localizedTextSchema, sourceIds: sourceIdsSchema }).strict())
      .optional(),
    famous: z.boolean(),
    images: z.array(imageSchema),
    /** Fields left empty or holding a disputed value. Listed in the phase uncertainties report. */
    uncertain: z
      .array(z.object({ field: z.enum(UNCERTAIN_FIELDS), note: z.string().trim().min(1) }).strict())
      .optional(),
    sources: z.array(sourceSchema).min(1),
    lastReviewed: z.iso.date(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const ids = new Set<string>();
    for (const src of s.sources) {
      if (ids.has(src.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate source id "${src.id}"` });
      }
      ids.add(src.id);
    }
    for (const [field, list] of citations(s)) {
      for (const sid of list) {
        if (!ids.has(sid)) {
          ctx.addIssue({
            code: 'custom',
            path: field.split('.'),
            message: `${field} cites unknown source "${sid}"`,
          });
        }
      }
    }
    if (s.scientificName !== s.genus && !s.scientificName.startsWith(`${s.genus} `)) {
      ctx.addIssue({ code: 'custom', message: 'scientificName must start with the genus' });
    }
    const flagged = (s.uncertain ?? []).map((u) => u.field);
    if (new Set(flagged).size !== flagged.length) {
      ctx.addIssue({ code: 'custom', message: 'uncertain lists a field twice' });
    }
  });
export type Species = z.infer<typeof speciesSchema>;

type CitableSpecies = Pick<
  Species,
  | 'timeRange'
  | 'diet'
  | 'nameMeaning'
  | 'groupSourceIds'
  | 'locations'
  | 'discovery'
  | 'taxonomy'
  | 'size'
  | 'summary'
  | 'funFacts'
>;

/** Every field that cites sources, with its path. The single list used by all citation checks. */
export function citations(s: CitableSpecies): [string, readonly string[]][] {
  return [
    ['timeRange', s.timeRange.sourceIds],
    ['diet', s.diet.sourceIds],
    ['nameMeaning', s.nameMeaning.sourceIds],
    ['group', s.groupSourceIds],
    ...s.locations.map((l, i): [string, string[]] => [`locations.${String(i)}`, l.sourceIds]),
    ['discovery', s.discovery.sourceIds],
    ['taxonomy', s.taxonomy.sourceIds ?? []],
    ['size.lengthM', s.size.lengthM?.sourceIds ?? []],
    ['size.massKg', s.size.massKg?.sourceIds ?? []],
    ['size.heightM', s.size.heightM?.sourceIds ?? []],
    ['size.wingspanM', s.size.wingspanM?.sourceIds ?? []],
    ['summary', s.summary.sourceIds],
    ...(s.funFacts ?? []).map((f, i): [string, string[]] => [`funFacts.${String(i)}`, f.sourceIds]),
  ];
}

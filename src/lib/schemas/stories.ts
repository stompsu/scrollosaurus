import { z } from 'zod';
import { localizedTextSchema, slugSchema, sourceIdsSchema, sourceSchema } from './common';

const wordCount = (text: string): number => text.split(/\s+/).length;

/** Short sourced text, at most `max` words in each language. */
const shortText = (max: number) =>
  localizedTextSchema.refine(
    (t) => wordCount(t.en) <= max && (t.pl === undefined || wordCount(t.pl) <= max),
    { message: `At most ${String(max)} words` },
  );

/**
 * Where the timeline goes for a story step or event. Never a hand-typed date: a geologic unit from
 * data/geologic-time.json, the boundary at a unit's base, or a species' own range.
 */
export const storyViewSchema = z.union([
  z.object({ unit: slugSchema }).strict(),
  z.object({ boundaryAtBaseOf: slugSchema }).strict(),
  z.object({ species: slugSchema }).strict(),
]);
export type StoryView = z.infer<typeof storyViewSchema>;

const withSources = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({
      ...shape,
      sources: z.array(sourceSchema).min(1),
      lastReviewed: z.iso.date(),
    })
    .strict();

/** Notes pinned to the timeline, e.g. the end-Cretaceous extinction and "birds are dinosaurs". */
export const eventsSchema = withSources({
  events: z
    .array(
      z
        .object({
          id: slugSchema,
          /** Pinned to the top (younger end) of this unit, e.g. "cretaceous" for the K–Pg boundary. */
          atTopOf: slugSchema,
          title: localizedTextSchema,
          text: shortText(70),
          sourceIds: sourceIdsSchema,
        })
        .strict(),
    )
    .min(1),
});
export type Events = z.infer<typeof eventsSchema>;

/** The guided tour: a few steps, each moving the timeline and telling a short sourced story. */
export const storySchema = withSources({
  steps: z
    .array(
      z
        .object({
          id: slugSchema,
          title: localizedTextSchema,
          text: shortText(70),
          view: storyViewSchema,
          /** Species to highlight on this step. */
          highlight: slugSchema.optional(),
          sourceIds: sourceIdsSchema,
        })
        .strict(),
    )
    .min(2)
    .max(8),
});
export type Story = z.infer<typeof storySchema>;

/** Familiar objects drawn next to a species for scale. */
export const sizeReferencesSchema = withSources({
  references: z
    .array(
      z
        .object({
          id: slugSchema,
          label: localizedTextSchema,
          /** Length along the ground (height for the person), m. */
          lengthM: z.number().positive(),
          /** Drawn height, m, for the silhouette's proportions. */
          heightM: z.number().positive(),
          /**
           * "reference": a chosen standard figure, not a measurement (the brief's 1.8 m adult).
           * "sourced": a real-world size with sources.
           */
          basis: z.enum(['reference', 'sourced']),
          note: localizedTextSchema.optional(),
          sourceIds: z.array(z.string()).optional(),
        })
        .strict()
        .refine((r) => r.basis === 'reference' || (r.sourceIds?.length ?? 0) > 0, {
          message: 'A sourced reference needs sourceIds',
        }),
    )
    .min(1),
});
export type SizeReferences = z.infer<typeof sizeReferencesSchema>;

/** Every source id cited in a file must be listed in its `sources`. */
export function uncitedOrUnknown(
  file: string,
  sources: readonly { id: string }[],
  cited: readonly (readonly string[])[],
): string[] {
  const ids = new Set(sources.map((s) => s.id));
  return cited
    .flat()
    .filter((id) => !ids.has(id))
    .map((id) => `${file}: cites unknown source "${id}"`);
}

export interface StoryCheckInput {
  events?: Events;
  story?: Story;
  sizeReferences?: SizeReferences;
  unitIds: ReadonlySet<string>;
  speciesSlugs: ReadonlySet<string>;
}

/** Cross-file checks: sources, unit ids and species slugs used by events, story and references. */
export function checkStories({
  events,
  story,
  sizeReferences,
  unitIds,
  speciesSlugs,
}: StoryCheckInput): string[] {
  const errors: string[] = [];
  const view = (at: string, v: StoryView) => {
    const unit = 'unit' in v ? v.unit : 'boundaryAtBaseOf' in v ? v.boundaryAtBaseOf : undefined;
    if (unit !== undefined && !unitIds.has(unit)) errors.push(`${at}: unknown unit "${unit}"`);
    if ('species' in v && !speciesSlugs.has(v.species)) {
      errors.push(`${at}: unknown species "${v.species}"`);
    }
  };
  if (events) {
    errors.push(
      ...uncitedOrUnknown(
        'events.json',
        events.sources,
        events.events.map((e) => e.sourceIds),
      ),
    );
    for (const e of events.events) {
      if (!unitIds.has(e.atTopOf)) errors.push(`events.json ${e.id}: unknown unit "${e.atTopOf}"`);
    }
  }
  if (story) {
    errors.push(
      ...uncitedOrUnknown(
        'story.json',
        story.sources,
        story.steps.map((s) => s.sourceIds),
      ),
    );
    const ids = new Set<string>();
    for (const s of story.steps) {
      if (ids.has(s.id)) errors.push(`story.json: duplicate step "${s.id}"`);
      ids.add(s.id);
      view(`story.json ${s.id}`, s.view);
      if (s.highlight !== undefined && !speciesSlugs.has(s.highlight)) {
        errors.push(`story.json ${s.id}: unknown species "${s.highlight}"`);
      }
    }
  }
  if (sizeReferences) {
    errors.push(
      ...uncitedOrUnknown(
        'size-references.json',
        sizeReferences.sources,
        sizeReferences.references.map((r) => r.sourceIds ?? []),
      ),
    );
  }
  return errors;
}

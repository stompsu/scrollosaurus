import { z } from 'zod';

/** Ages are in millions of years ago (Ma). `baseMa` is the older boundary, `topMa` the younger. */
export const geologicRankSchema = z.enum(['era', 'period', 'epoch', 'stage']);
export type GeologicRank = z.infer<typeof geologicRankSchema>;

const RANK_ORDER: readonly GeologicRank[] = ['era', 'period', 'epoch', 'stage'];

export const geologicUnitSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    rank: geologicRankSchema,
    parent: z.string().optional(),
    baseMa: z.number().positive(),
    baseUncertaintyMa: z.number().nonnegative().optional(),
    /** The chart gives this boundary only as an approximate age ("~"). */
    baseApproximate: z.literal(true).optional(),
    topMa: z.number().nonnegative(),
    topUncertaintyMa: z.number().nonnegative().optional(),
    topApproximate: z.literal(true).optional(),
  })
  .strict()
  .refine((u) => u.baseMa > u.topMa, {
    message: 'baseMa (older) must be greater than topMa (younger)',
  });
export type GeologicUnit = z.infer<typeof geologicUnitSchema>;

export const geologicTimeSchema = z
  .object({
    chart: z
      .object({
        name: z.string().min(1),
        publisher: z.string().min(1),
        version: z.string().regex(/^v\d{4}\/\d{2}$/),
        url: z.url(),
        citation: z.string().min(1),
        license: z.string().min(1),
        accessed: z.iso.date(),
      })
      .strict(),
    units: z.array(geologicUnitSchema).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    const byId = new Map<string, GeologicUnit>();
    for (const unit of data.units) {
      if (byId.has(unit.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate unit id "${unit.id}"` });
      }
      byId.set(unit.id, unit);
    }

    for (const unit of data.units) {
      if (unit.parent === undefined) {
        if (unit.rank !== 'era') {
          ctx.addIssue({ code: 'custom', message: `Unit "${unit.id}" needs a parent` });
        }
        continue;
      }
      const parent = byId.get(unit.parent);
      if (!parent) {
        ctx.addIssue({
          code: 'custom',
          message: `Unit "${unit.id}" has unknown parent "${unit.parent}"`,
        });
        continue;
      }
      if (RANK_ORDER.indexOf(parent.rank) !== RANK_ORDER.indexOf(unit.rank) - 1) {
        ctx.addIssue({
          code: 'custom',
          message: `Unit "${unit.id}" (${unit.rank}) cannot be a child of "${parent.id}" (${parent.rank})`,
        });
      }
      if (unit.baseMa > parent.baseMa || unit.topMa < parent.topMa) {
        ctx.addIssue({
          code: 'custom',
          message: `Unit "${unit.id}" lies outside its parent "${parent.id}"`,
        });
      }
    }

    // Siblings must tile their parent with no gaps or overlaps. Exact equality is intentional:
    // shared boundaries are copied as identical literals from the ICS chart, so an epsilon would
    // only hide typos such as 201.4 vs 201.40001.
    for (const parent of data.units) {
      const children = data.units
        .filter((u) => u.parent === parent.id)
        .sort((a, b) => b.baseMa - a.baseMa);
      if (children.length === 0) continue;
      const first = children[0];
      const last = children[children.length - 1];
      if (first && first.baseMa !== parent.baseMa) {
        ctx.addIssue({
          code: 'custom',
          message: `Children of "${parent.id}" must start at its base (${parent.baseMa} Ma)`,
        });
      }
      if (last && last.topMa !== parent.topMa) {
        ctx.addIssue({
          code: 'custom',
          message: `Children of "${parent.id}" must end at its top (${parent.topMa} Ma)`,
        });
      }
      for (let i = 1; i < children.length; i++) {
        const prev = children[i - 1];
        const curr = children[i];
        if (prev && curr && prev.topMa !== curr.baseMa) {
          ctx.addIssue({
            code: 'custom',
            message: `Gap or overlap between "${prev.id}" and "${curr.id}"`,
          });
        }
        // A shared boundary is either approximate on both sides or on neither.
        if (prev && curr && (prev.topApproximate ?? false) !== (curr.baseApproximate ?? false)) {
          ctx.addIssue({
            code: 'custom',
            message: `"${prev.id}" and "${curr.id}" disagree on whether their boundary is approximate`,
          });
        }
      }
    }
  });
export type GeologicTime = z.infer<typeof geologicTimeSchema>;

import { z } from 'zod';
import { slugSchema, sourceIdsSchema, sourceSchema } from './common';

/**
 * The group tree used for classification and filters. Names are scientific and never translated.
 * Roots are either `dinosauria` or a non-dinosaur group (pterosaurs, marine reptiles).
 * `filter` marks the nodes offered in the group filter: "clade" for top-level groups
 * (Theropoda, Sauropodomorpha, Ornithischia), "subgroup" for the ones nested under them.
 */
export const groupNodeSchema = z
  .object({
    id: slugSchema,
    name: z.string().trim().min(1),
    parent: slugSchema.optional(),
    isDinosaur: z.boolean(),
    filter: z.enum(['clade', 'subgroup']).optional(),
    sourceIds: sourceIdsSchema,
  })
  .strict();
export type GroupNode = z.infer<typeof groupNodeSchema>;

export const groupsSchema = z
  .object({
    groups: z.array(groupNodeSchema).min(1),
    sources: z.array(sourceSchema).min(1),
    lastReviewed: z.iso.date(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const g of data.groups) {
      if (ids.has(g.id)) ctx.addIssue({ code: 'custom', message: `Duplicate group id "${g.id}"` });
      ids.add(g.id);
    }
    const byId = new Map(data.groups.map((g) => [g.id, g]));
    const sourceIds = new Set(data.sources.map((s) => s.id));
    for (const g of data.groups) {
      for (const sid of g.sourceIds) {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: 'custom',
            message: `Group "${g.id}" cites unknown source "${sid}"`,
          });
        }
      }
      if (g.parent === undefined) {
        if (g.isDinosaur && g.id !== 'dinosauria') {
          ctx.addIssue({
            code: 'custom',
            message: `Root group "${g.id}" must be dinosauria or a non-dinosaur group`,
          });
        }
        continue;
      }
      const parent = byId.get(g.parent);
      if (!parent) {
        ctx.addIssue({
          code: 'custom',
          message: `Group "${g.id}" has unknown parent "${g.parent}"`,
        });
        continue;
      }
      if (parent.isDinosaur !== g.isDinosaur) {
        ctx.addIssue({
          code: 'custom',
          message: `Group "${g.id}" isDinosaur differs from its parent "${parent.id}"`,
        });
      }
      // Walk up to catch cycles.
      const seen = new Set([g.id]);
      let cur: GroupNode | undefined = parent;
      while (cur) {
        if (seen.has(cur.id)) {
          ctx.addIssue({ code: 'custom', message: `Group "${g.id}" is part of a cycle` });
          break;
        }
        seen.add(cur.id);
        cur = cur.parent === undefined ? undefined : byId.get(cur.parent);
      }
    }
  });
export type Groups = z.infer<typeof groupsSchema>;

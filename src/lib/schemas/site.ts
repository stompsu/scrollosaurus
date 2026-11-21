import { z } from 'zod';
import { slugSchema } from './common';

/** Site-wide content settings. `primarySpecies` is highlighted first when the URL has no selection. */
export const siteSchema = z
  .object({
    primarySpecies: slugSchema,
  })
  .strict();
export type Site = z.infer<typeof siteSchema>;

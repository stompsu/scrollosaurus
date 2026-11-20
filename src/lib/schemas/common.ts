import { z } from 'zod';

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase-hyphenated ids');

/**
 * Translatable text. English is required now; Polish arrives in Phase 6, so it is optional and
 * `pnpm validate:data` only warns when it is missing.
 */
export const localizedTextSchema = z
  .object({
    en: z.string().trim().min(1),
    pl: z.string().trim().min(1).optional(),
  })
  .strict();
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** A bibliographic source. `id` is local to the file and is what fields cite in `sourceIds`. */
export const sourceSchema = z
  .object({
    id: slugSchema,
    title: z.string().trim().min(1),
    authors: z.string().trim().min(1).optional(),
    year: z.number().int().min(1800).max(2100).optional(),
    publisher: z.string().trim().min(1).optional(),
    doi: z
      .string()
      .regex(/^10\.\d{4,9}\/\S+$/, 'DOI without the https://doi.org/ prefix')
      .optional(),
    url: z.url(),
    accessed: z.iso.date(),
  })
  .strict();
export type Source = z.infer<typeof sourceSchema>;

export const sourceIdsSchema = z.array(slugSchema).min(1, 'Cite at least one source id');

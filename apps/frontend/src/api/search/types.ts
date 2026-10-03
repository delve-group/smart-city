import { z } from "zod";

export const SEARCH_MODES = ["hybrid", "semantic", "keyword"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** Resident search deliberately accepts only the public incident result kind. */
export const publicSearchPageSchema = z.object({
  status: z.enum(["ready", "index_stale"]),
  items: z.array(z.strictObject({
    record_type: z.literal("incident"), record_id: z.string().min(1),
    source_version: z.number().int().positive(), title: z.string(), excerpt: z.string(),
    category_id: z.string().nullable(), score: z.number().finite(), indexed_at: z.iso.datetime({ offset: true }),
  })),
  next_cursor: z.null(),
});
export type PublicSearchPage = z.infer<typeof publicSearchPageSchema>;

import { z } from "zod";

/** Wire format. Categories are defined by the API; the frontend only styles known ids. */
export const categoryDtoSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  description: z.string(),
});

export type CategoryDto = z.infer<typeof categoryDtoSchema>;

export const categoriesResponseSchema = z.object({ categories: z.array(categoryDtoSchema).min(1) });

export type CategoriesResponseDto = z.infer<typeof categoriesResponseSchema>;

export type Category = { id: string; label: string; description: string };

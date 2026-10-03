import { mapCategoryDto } from "./mappers";
import { categoriesResponseSchema, type Category } from "./types";

/** GET /api/categories */
export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch("/api/categories", { signal });
  if (!response.ok) throw new Error(`Could not load categories (${response.status}).`);

  const body = categoriesResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected categories response.");

  return body.data.categories.map(mapCategoryDto);
}

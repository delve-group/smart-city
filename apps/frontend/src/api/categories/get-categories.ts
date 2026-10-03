import { mapCategoryDto } from "./mappers";
import { categoriesResponseSchema, type Category } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { CATEGORIES } from "@/app/api/categories/categories";

/** GET /api/categories */
export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  if (USE_MOCKS) return fromMock(() => CATEGORIES.map(mapCategoryDto));
  const response = await fetch("/api/categories", { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load categories (${response.status}).`);

  const body = categoriesResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected categories response.");

  return body.data.data.map(mapCategoryDto);
}

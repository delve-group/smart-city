import type { CategoriesResponseDto } from "@/api/categories/types";
import { CATEGORIES } from "./categories";

/** Mock endpoint (demo data). */
export function GET() {
  return Response.json({ categories: CATEGORIES } satisfies CategoriesResponseDto);
}

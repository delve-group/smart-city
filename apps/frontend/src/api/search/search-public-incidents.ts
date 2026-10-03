import { z } from "zod";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockPublicSearch } from "../mocks/search";
import { publicSearchPageSchema, type SearchMode } from "./types";

export async function searchPublicIncidents(query: string, mode: SearchMode, categoryIds: readonly string[], signal: AbortSignal) {
  if (USE_MOCKS) return fromMock(() => publicSearchPageSchema.parse(mockPublicSearch(query, categoryIds)));
  const parameters = new URLSearchParams({ q: query, mode, record_type: "incident", limit: "10" });
  for (const id of categoryIds) parameters.append("category_id", id);
  // An existing staff cookie must not turn the resident map into official search.
  const response = await fetch(`/api/search/records?${parameters}`, {
    credentials: "omit", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok) throw new Error("Public incident search is unavailable.");
  const parsed = z.object({ data: publicSearchPageSchema, correlation_id: z.string() }).safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected public incident search response.");
  return parsed.data.data;
}

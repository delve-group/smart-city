import { mapReportsResponse } from "./mappers";
import { reportsResponseSchema, type ReportsResult } from "./types";

/** GET /api/reports — reports outside `categoryIds` are dropped. */
export async function getReports(categoryIds: ReadonlySet<string>, signal?: AbortSignal): Promise<ReportsResult> {
  const response = await fetch("/api/reports", { signal });
  if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);

  const body = reportsResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected reports response.");

  return mapReportsResponse(body.data.source, body.data.reports, categoryIds);
}

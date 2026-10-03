import { mapReportsResponse } from "./mappers";
import { reportsResponseSchema, type ReportsResult } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { listReports } from "@/app/api/reports/report-store";

/** GET /api/reports — reports outside `categoryIds` are dropped. */
export async function getReports(categoryIds: ReadonlySet<string>, signal?: AbortSignal): Promise<ReportsResult> {
  if (USE_MOCKS) return fromMock(() => mapReportsResponse("demo", listReports(), categoryIds));
  const response = await fetch("/api/reports", { signal });
  if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);

  const body = reportsResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected reports response.");

  return mapReportsResponse(body.data.source, body.data.reports, categoryIds);
}

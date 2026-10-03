import { mapReportDto } from "./mappers";
import { reportDtoSchema, type CityReport } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { confirmReport as confirmMockReport } from "@/app/api/reports/report-store";

/** POST /api/reports/:id/confirmations — the resident is affected too. Returns the updated report. */
export async function confirmReport(id: string, signal?: AbortSignal): Promise<CityReport> {
  if (USE_MOCKS) {
    return fromMock(() => {
      const report = confirmMockReport(id);
      if (!report) throw new Error("This report no longer exists.");
      if (report === "resolved") throw new Error("This report is already resolved.");
      return mapReportDto(report);
    });
  }
  const response = await fetch(`/api/reports/${encodeURIComponent(id)}/confirmations`, { method: "POST", signal });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `Could not add your confirmation (${response.status}).`);
  }

  const body = reportDtoSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected response after confirming the report.");

  return mapReportDto(body.data);
}

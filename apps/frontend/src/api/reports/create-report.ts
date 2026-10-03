import { mapReportDto } from "./mappers";
import { reportDtoSchema, type CityReport, type CreateReportInput } from "./types";

/** POST /api/reports */
export async function createReport(input: CreateReportInput, signal?: AbortSignal): Promise<CityReport> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `Could not submit the report (${response.status}).`);
  }

  const body = reportDtoSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected response after submitting the report.");

  return mapReportDto(body.data);
}

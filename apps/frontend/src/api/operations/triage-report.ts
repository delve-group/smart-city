import { requestWorkspace } from "./request-workspace";
import type { ReportTriage } from "./types";

/** POST /api/operations/reports/:id/triage — link, start a new incident, or keep private / out of scope. */
export function triageReport(reportId: string, triage: ReportTriage) {
  return requestWorkspace(`/api/operations/reports/${encodeURIComponent(reportId)}/triage`, {
    method: "POST",
    body: JSON.stringify(triage),
  });
}

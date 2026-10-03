import { requestWorkspace } from "./request-workspace";
import type { ReportTriage } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import * as mock from "../mocks/operations-store";
import { mapWorkspace } from "./mappers";

/** POST /api/operations/reports/:id/triage — link, start a new incident, or keep private / out of scope. */
export function triageReport(reportId: string, triage: ReportTriage) {
  if (USE_MOCKS) return fromMock(() => mapWorkspace(mock.triageReport(reportId, triage)));
  return requestWorkspace(`/api/operations/reports/${encodeURIComponent(reportId)}/triage`, {
    method: "POST",
    body: JSON.stringify(triage),
  });
}

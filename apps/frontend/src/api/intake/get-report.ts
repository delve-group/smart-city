import { requestIntake } from "./request-intake";
import { submittedReportSchema } from "./types";

export function getReport(id: string) {
  return requestIntake(`/api/reports/${encodeURIComponent(id)}`, submittedReportSchema);
}

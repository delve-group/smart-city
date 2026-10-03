import { jsonBody, requestIntake } from "@/api/intake/request-intake";
import { submittedReportSchema } from "@/api/intake/types";

/** Canonical confirmed-draft submission. The server owns its submission key. */
export function createReport(draftId: string, revision: number) {
  return requestIntake("/api/reports", submittedReportSchema, jsonBody("POST", { draft_id: draftId, revision }));
}

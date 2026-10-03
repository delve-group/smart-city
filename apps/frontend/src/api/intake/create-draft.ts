import { jsonBody, requestIntake } from "./request-intake";
import { intakeDraftSchema, type DraftFieldsPatch } from "./types";

export function createDraft(fields: DraftFieldsPatch = {}) {
  return requestIntake("/api/report-drafts", intakeDraftSchema, jsonBody("POST", { fields }));
}

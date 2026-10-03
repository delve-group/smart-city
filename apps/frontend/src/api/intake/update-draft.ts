import { jsonBody, requestIntake } from "./request-intake";
import { intakeDraftSchema, type DraftFieldsPatch } from "./types";

export function updateDraft(id: string, revision: number, fields: DraftFieldsPatch) {
  return requestIntake(`/api/report-drafts/${encodeURIComponent(id)}`, intakeDraftSchema,
    jsonBody("PATCH", { expected_revision: revision, fields }));
}

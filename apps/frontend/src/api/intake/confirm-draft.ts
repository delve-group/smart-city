import { jsonBody, requestIntake } from "./request-intake";
import { intakeDraftSchema } from "./types";

export function confirmDraft(id: string, revision: number, channel: "button" | "voice" = "button") {
  return requestIntake(`/api/report-drafts/${encodeURIComponent(id)}/confirmation`, intakeDraftSchema,
    jsonBody("POST", { revision, channel }));
}

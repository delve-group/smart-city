import { requestIntake } from "./request-intake";
import { intakeDraftSchema } from "./types";

export function getDraft(id: string, signal?: AbortSignal) {
  return requestIntake(`/api/report-drafts/${encodeURIComponent(id)}`, intakeDraftSchema, { signal });
}

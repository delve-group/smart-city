import { requestIntake } from "./request-intake";
import { intakeDraftSchema } from "./types";

export function getDraft(id: string) {
  return requestIntake(`/api/report-drafts/${encodeURIComponent(id)}`, intakeDraftSchema);
}

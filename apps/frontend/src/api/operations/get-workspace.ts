import { requestWorkspace } from "./request-workspace";

/** GET /api/operations/review — queue, incidents, reports and institutions the official may see. */
export function getWorkspace(signal?: AbortSignal) {
  return requestWorkspace("/api/operations/review", { signal });
}

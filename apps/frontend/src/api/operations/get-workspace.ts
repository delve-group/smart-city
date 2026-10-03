import { requestWorkspace } from "./request-workspace";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockWorkspace } from "../mocks/operations-store";
import { mapWorkspace } from "./mappers";

/** GET /api/operations/review — queue, incidents, reports and institutions the official may see. */
export function getWorkspace(signal?: AbortSignal) {
  if (USE_MOCKS) return fromMock(() => mapWorkspace(mockWorkspace()));
  return requestWorkspace("/api/operations/review", { signal });
}

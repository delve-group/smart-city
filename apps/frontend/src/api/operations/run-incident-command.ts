import { requestWorkspace } from "./request-workspace";
import type { IncidentCommand } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import * as mock from "../mocks/operations-store";
import { mapWorkspace } from "./mappers";

/** POST /api/operations/incidents/:id/commands — responsibility, verify, dispute, close, reopen. */
export function runIncidentCommand(incidentId: string, command: IncidentCommand) {
  if (USE_MOCKS) return fromMock(() => mapWorkspace(mock.runIncidentCommand(incidentId, command)));
  return requestWorkspace(`/api/operations/incidents/${encodeURIComponent(incidentId)}/commands`, {
    method: "POST",
    body: JSON.stringify(command),
  });
}

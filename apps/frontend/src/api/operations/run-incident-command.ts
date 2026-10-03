import { requestWorkspace } from "./request-workspace";
import type { IncidentCommand } from "./types";

/** POST /api/operations/incidents/:id/commands — responsibility, verify, dispute, close, reopen. */
export function runIncidentCommand(incidentId: string, command: IncidentCommand) {
  return requestWorkspace(`/api/operations/incidents/${encodeURIComponent(incidentId)}/commands`, {
    method: "POST",
    body: JSON.stringify(command),
  });
}

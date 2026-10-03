import { incidentCommandSchema } from "@/api/operations/types";
import { handleApi, success } from "@/server/http/api";
import { runIncidentCommand } from "../../../operations-store";
import { parseCommand } from "../../../parse-command";

/** Demo endpoint: responsibility, verify, dispute, close and reopen, each against the expected version. */
export async function POST(request: Request, { params }: RouteContext<"/api/operations/incidents/[id]/commands">) {
  return handleApi(async (correlationId) => {
    const { id } = await params;
    const command = await parseCommand(request, incidentCommandSchema);
    return success(runIncidentCommand(id, command), correlationId);
  });
}

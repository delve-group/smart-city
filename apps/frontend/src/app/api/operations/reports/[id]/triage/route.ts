import { reportTriageSchema } from "@/api/operations/types";
import { handleApi, success } from "@/server/http/api";
import { triageReport } from "../../../operations-store";
import { parseCommand } from "../../../parse-command";

/** Demo endpoint: link a report under review, start an incident, or keep it private / out of scope. */
export async function POST(request: Request, { params }: RouteContext<"/api/operations/reports/[id]/triage">) {
  return handleApi(async (correlationId) => {
    const { id } = await params;
    const triage = await parseCommand(request, reportTriageSchema);
    return success(triageReport(id, triage), correlationId);
  });
}

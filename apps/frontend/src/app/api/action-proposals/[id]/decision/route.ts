import { proposalDecisionSchema } from "@/api/operations/types";
import { handleApi, success } from "@/server/http/api";
import { decideProposal } from "../../../operations/operations-store";
import { parseCommand } from "../../../operations/parse-command";

/** Demo endpoint: approve (exactly one ticket, repeat-safe) or reject (no ticket) a proposal version. */
export async function POST(request: Request, { params }: RouteContext<"/api/action-proposals/[id]/decision">) {
  return handleApi(async (correlationId) => {
    const { id } = await params;
    const decision = await parseCommand(request, proposalDecisionSchema);
    return success(decideProposal(id, decision), correlationId);
  });
}

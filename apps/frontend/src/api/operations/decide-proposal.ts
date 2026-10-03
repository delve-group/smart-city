import { requestWorkspace } from "./request-workspace";
import type { ProposalDecision } from "./types";

/** POST /api/action-proposals/:id/decision — approve (creates exactly one ticket) or reject (creates none). */
export function decideProposal(proposalId: string, decision: ProposalDecision) {
  return requestWorkspace(`/api/action-proposals/${encodeURIComponent(proposalId)}/decision`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
}

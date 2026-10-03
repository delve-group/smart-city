import { requestWorkspace } from "./request-workspace";
import type { ProposalDecision } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import * as mock from "../mocks/operations-store";
import { mapWorkspace } from "./mappers";

/** POST /api/action-proposals/:id/decision — approve (creates exactly one ticket) or reject (creates none). */
export function decideProposal(proposalId: string, decision: ProposalDecision) {
  if (USE_MOCKS) return fromMock(() => mapWorkspace(mock.decideProposal(proposalId, decision)));
  return requestWorkspace(`/api/action-proposals/${encodeURIComponent(proposalId)}/decision`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
}

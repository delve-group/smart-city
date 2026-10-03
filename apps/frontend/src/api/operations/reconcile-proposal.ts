import { requestWorkspace } from "./request-workspace";
import type { Reconciliation } from "./types";

/** POST /api/action-proposals/:id/reconciliation — look an unknown sending outcome up at the institution. */
export function reconcileProposal(proposalId: string, input: Reconciliation) {
  return requestWorkspace(`/api/action-proposals/${encodeURIComponent(proposalId)}/reconciliation`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

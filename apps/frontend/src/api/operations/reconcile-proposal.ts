import { requestWorkspace } from "./request-workspace";
import type { Reconciliation } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import * as mock from "../mocks/operations-store";
import { mapWorkspace } from "./mappers";

/** POST /api/action-proposals/:id/reconciliation — look an unknown sending outcome up at the institution. */
export function reconcileProposal(proposalId: string, input: Reconciliation) {
  if (USE_MOCKS) return fromMock(() => mapWorkspace(mock.reconcileProposal(proposalId, input)));
  return requestWorkspace(`/api/action-proposals/${encodeURIComponent(proposalId)}/reconciliation`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

import "server-only";

import { systemContext } from "@/server/actor-context";
import { ApiError } from "@/server/http/api";
import type { WorkItem, WorkResult } from "@/server/jobs";
import { executeApprovedProposal } from "./executor";

/** `execute` work handler (workflow contracts §8): runs the trusted executor for one approved proposal. */
export async function handleExecuteWork(work: WorkItem): Promise<WorkResult> {
  if (work.source.type !== "action_proposal") return { status: "failed", reason: "Execute work must reference an action proposal." };
  try {
    const outcome = await executeApprovedProposal(systemContext("executor", work.correlation_id), work.source.id);
    if (outcome.status === "executed") return { status: "done", detail: `ticket:${outcome.ticket_reference}${outcome.replayed ? " (replayed)" : ""}` };
    if (outcome.status === "stale") return { status: "done", detail: `not executed: ${outcome.detail}` };
    // Known no-effect failure: the same key may be retried after revalidation.
    if (outcome.status === "failed") return { status: "retry", reason: outcome.reason };
    // Unknown outcome: never resend automatically.
    return { status: "failed", reason: "execution_unknown" };
  } catch (error) {
    if (error instanceof ApiError) return { status: "failed", reason: error.code };
    return { status: "retry", reason: "executor_unavailable" };
  }
}

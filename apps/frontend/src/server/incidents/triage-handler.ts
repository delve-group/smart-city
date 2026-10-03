import "server-only";

import { systemContext } from "@/server/actor-context";
import { ApiError } from "@/server/http/api";
import type { WorkItem, WorkResult } from "@/server/jobs";
import { triageReport } from "./triage";

/**
 * `triage` work handler (workflow contracts §8). Deterministic and local: it needs neither the
 * search index nor a model, so their outage never blocks grouping or review.
 */
export async function handleTriageWork(work: WorkItem): Promise<WorkResult> {
  if (work.source.type !== "report") return { status: "failed", reason: "Triage work must reference a report." };
  try {
    const outcome = await triageReport(systemContext("triage", work.correlation_id), {
      report_id: work.source.id,
      expected_version: work.source.version,
    });
    if (outcome.status === "superseded") return { status: "done", detail: `superseded: ${outcome.detail}` };
    return { status: "done", detail: outcome.status === "linked" ? `linked:${outcome.incident_id}` : `needs_review:${outcome.reason}` };
  } catch (error) {
    if (error instanceof ApiError) {
      // A concurrent change won the race: let the worker retry from fresh state.
      if (error.code === "version_conflict") return { status: "retry", reason: error.code };
      return { status: "failed", reason: error.code };
    }
    return { status: "retry", reason: "triage_unavailable" };
  }
}

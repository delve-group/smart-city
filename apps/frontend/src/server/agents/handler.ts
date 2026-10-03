import "server-only";
import { createHash } from "node:crypto";

import { systemContext } from "@/server/actor-context";
import { getAssessmentAction, markAssessmentReview } from "@/server/actions/assessment";
import { proposeAction } from "@/server/actions/proposals";
import { ConfigurationError } from "@/server/config";
import { ApiError } from "@/server/http/api";
import { getIncidentContext } from "@/server/incidents/context";
import { isUuid } from "@/server/incidents/incidents";
import type { WorkItem, WorkResult } from "@/server/jobs";
import { SearchError } from "@/server/search/errors";
import { searchRecords } from "@/server/search/service";
import { parseAssessmentInput, parseAssessmentOutput, type AssessmentInput } from "./assessment";
import { getDecisionProvider } from "./config";
import { AssessmentError } from "./errors";
import { assessIncident } from "./scaleway";
import { buildAssessmentSnapshot } from "./snapshot";
import {
  assessmentKey, beginAssessmentAttempt, finishAssessment, getOrCreateAssessment, getReceivedAssessment,
  recordAssessmentFailure, saveAssessmentResponse, setAssessmentProvider, type ReceivedAssessment,
} from "./store";

const providerFailureNote = "Automated assessment could not complete. The incident remains available for an official to review; no action was approved or sent.";

/** One incident/version, one bounded suggestion. Triage, approval and execution remain separate. */
export async function handleAssessmentWork(work: WorkItem): Promise<WorkResult> {
  if (work.kind !== "assess" || work.source.type !== "incident" || !isUuid(work.source.id)) {
    return { status: "failed", reason: "invalid_assessment_work" };
  }
  const key = assessmentKey(work.source.id, work.source.version);
  const ctx = systemContext("decision_maker", work.correlation_id);
  const review = async (code: string, explanation: string): Promise<WorkResult> => {
    const outcome = await markAssessmentReview(ctx, {
      incident_id: work.source.id, expected_incident_version: work.source.version, explanation,
    });
    await finishAssessment(key, outcome, code);
    return { status: "done", detail: `assessment_${outcome}:${code}` };
  };
  const superseded = async (): Promise<WorkResult> => {
    await finishAssessment(key, "superseded", "source_changed");
    return { status: "done", detail: "assessment_superseded" };
  };
  const applyReceived = async (received: ReceivedAssessment): Promise<WorkResult> => {
    const input = parseAssessmentInput(received.snapshot);
    const output = parseAssessmentOutput(received.result.assessment, input);
    // Zod restores schema property order after JSONB storage before hashing.
    const snapshotHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    if (input.incident.id !== work.source.id || input.incident.version !== work.source.version
      || received.result.basis.incident_id !== work.source.id || received.result.basis.incident_version !== work.source.version
      || received.snapshot_sha256 !== snapshotHash || received.result.basis.snapshot_sha256 !== snapshotHash) {
      return review("invalid_stored_assessment", "The saved assessment did not match this incident version. An official must review the current case.");
    }
    if (output.outcome === "review") return review("provider_review", output.explanation);
    const selected = input.allowed_actions.find((action) => action.id === output.action_id)!;
    try {
      const proposal = await proposeAction(ctx, {
        incident_id: work.source.id, expected_incident_version: work.source.version, assessment_key: key,
        institution_id: selected.institution_id, explanation: output.explanation, evidence_ids: output.evidence_ids,
      });
      await finishAssessment(key, "proposal", "pending_official_approval", proposal.proposal_id);
      return { status: "done", detail: "assessment_proposal_pending_approval" };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return superseded();
      if (error instanceof ApiError && error.status === 409) {
        return review("proposal_preconditions_changed", "The incident or its action state changed during assessment. Review the current case before preparing an action.");
      }
      throw error;
    }
  };

  try {
    const stored = await getOrCreateAssessment(work);
    if (stored.state !== "running") return { status: "done", detail: `assessment_${stored.state}` };
    const received = await getReceivedAssessment(key);
    if (received) return await applyReceived(received);

    const provider = getDecisionProvider();
    await setAssessmentProvider(key, provider);
    if (provider === "disabled") {
      return await review("provider_disabled", "Automated assessment is disabled. An official can review the incident and prepare an action manually.");
    }
    const [context, permitted] = await Promise.all([
      getIncidentContext(ctx, work.source.id), getAssessmentAction(ctx, work.source.id),
    ]);
    if (context.incident.version !== work.source.version || permitted.incident_version !== work.source.version) return await superseded();
    if (!permitted.action) return await review("no_permitted_action", permitted.reason ?? "No action is currently permitted. An official must review the case.");
    if (context.evidence.length > 8) {
      return await review("evidence_limit", "The case contains more than eight evidence items. An official must review the complete evidence; the automated assessment did not omit any items.");
    }
    if (context.evidence.some((item) => item.report_id && !context.reports.some((report) => report.id === item.report_id))) {
      return await review("evidence_unavailable", "A stored evidence reference has no available report in the current case. An official must review the complete evidence.");
    }

    let related: AssessmentInput["related_records"] = [];
    let retrievalState: AssessmentInput["retrieval_state"] = "degraded";
    try {
      const page = await searchRecords(ctx, { related_type: "incident", related_id: work.source.id, limit: 20 });
      related = page.items.map((item) => ({ record_type: item.record_type, record_id: item.record_id,
        version: item.source_version, excerpt: item.excerpt }));
      retrievalState = page.status === "ready" ? "available" : "degraded";
    } catch (error) {
      if (!(error instanceof SearchError) && !(error instanceof ConfigurationError)
        && !(error instanceof ApiError && error.status === 503)) throw error;
      // Optional retrieval cannot replace the authoritative incident context or triage.
    }
    const snapshot = buildAssessmentSnapshot(context, permitted.action, related, retrievalState);
    const current = await getAssessmentAction(ctx, work.source.id);
    if (current.incident_version !== work.source.version) return await superseded();
    if (!current.action || current.action.id !== permitted.action.id
      || current.action.institution_id !== permitted.action.institution_id) {
      return await review("action_changed", "The permitted action changed while the assessment was prepared. An official must review the current case.");
    }
    const attempt = await beginAssessmentAttempt(key, snapshot);
    if (attempt === null) return await review("attempt_limit", providerFailureNote);
    let result;
    try {
      result = await assessIncident(snapshot);
    } catch (error) {
      const code = error instanceof AssessmentError ? error.code
        : error instanceof ConfigurationError ? "provider_configuration_invalid" : "assessment_dependency_unavailable";
      const retry = error instanceof AssessmentError && error.retryable && attempt < 3;
      await recordAssessmentFailure(key, attempt, code, retry);
      const outcome = await markAssessmentReview(ctx, {
        incident_id: work.source.id, expected_incident_version: work.source.version, explanation: providerFailureNote,
      });
      if (outcome === "superseded") return await superseded();
      if (retry) return { status: "retry", reason: code };
      await finishAssessment(key, "review", code);
      return { status: "done", detail: `assessment_review:${code}` };
    }
    await saveAssessmentResponse(key, attempt, result);
    const saved = await getReceivedAssessment(key);
    if (!saved) throw new Error("The saved assessment response is unavailable.");
    return await applyReceived(saved);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return await superseded();
    if (error instanceof ConfigurationError) return await review("provider_configuration_invalid", providerFailureNote);
    if (error instanceof AssessmentError && !error.retryable) {
      return await review(error.code, "The case exceeds the assessment's safe input limits or its saved response is invalid. An official must review the full current evidence.");
    }
    if (work.attempt >= 3) {
      try { return await review("assessment_dependency_unavailable", providerFailureNote); }
      catch { /* A database outage can also prevent storing the review; queue status remains visible. */ }
    }
    // Persistence failures remain visible through the ordinary bounded queue retry.
    return { status: "retry", reason: "assessment_dependency_unavailable" };
  }
}

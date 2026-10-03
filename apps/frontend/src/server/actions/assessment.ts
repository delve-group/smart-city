import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { findIncidentRow, type IncidentRow } from "@/server/incidents/incidents";
import { getServiceObservations } from "@/server/incidents/observations";
import { resolveResponsibility } from "@/server/incidents/responsibility";
import { getProposalPayload, RULE_BASED_PROPOSER } from "./proposal-lifecycle";

export function requireDecisionMaker(ctx: ActorContext): void {
  if (ctx.kind !== "system" || ctx.principal !== "decision_maker") {
    throw new ApiError(403, "forbidden", "Only the decision-maker can assess an incident.");
  }
}

/** Human decisions and an existing model proposal retain authority at the same version. */
export async function hasProtectedProposal(client: PoolClient, incident: IncidentRow): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM action_proposals WHERE incident_id = $1 AND incident_version = $2
       AND (state IN ('approved', 'executing', 'executed', 'unknown', 'rejected')
         OR (state = 'pending' AND created_by <> $3)) LIMIT 1`,
    [incident.id, incident.version, RULE_BASED_PROPOSER],
  );
  return Boolean(result.rowCount);
}

export interface AssessmentAction {
  id: string;
  institution_id: string;
  action: "create_service_ticket";
  payload_summary: string;
}

/** Called against a locked incident; no caller/model supplied destination or payload. */
export async function currentAssessmentAction(client: PoolClient, incident: IncidentRow): Promise<{
  action: AssessmentAction | null; reason: string | null;
}> {
  if (incident.urgent || incident.assessment === "disputed") {
    return { action: null, reason: "Urgent or disputed evidence requires an official decision." };
  }
  if (!["new", "triaged"].includes(incident.response_status) || incident.review_reason === "ticket_rejected") {
    return { action: null, reason: "This incident already has work or requires a new official responsibility decision." };
  }
  const uncertainEvidence = await client.query(
    "SELECT 1 FROM incident_evidence WHERE incident_id = $1 AND removed_at IS NULL AND state IN ('stale', 'missing', 'contradictory') LIMIT 1", [incident.id],
  );
  if (uncertainEvidence.rowCount || getServiceObservations(incident).some((item) => item.state !== "current")) {
    return { action: null, reason: "Missing, stale or contradictory service evidence requires an official review." };
  }
  const busy = await client.query(
    `SELECT 1 FROM service_tickets WHERE incident_id = $1 AND status IN ('created', 'acknowledged', 'in_progress')
     UNION ALL SELECT 1 FROM action_proposals WHERE incident_id = $1 AND state IN ('executing', 'unknown') LIMIT 1`,
    [incident.id],
  );
  if (busy.rowCount || await hasProtectedProposal(client, incident)) {
    return { action: null, reason: "An existing proposal, human decision or active ticket takes precedence." };
  }
  if (!incident.responsible_institution_id) return { action: null, reason: "Responsibility is not established." };
  if (incident.responsibility_rule_id) {
    const responsibility = await resolveResponsibility({
      category_id: incident.category_id, issue_type: incident.issue_type,
      location: { lat: incident.anchor_lat, lng: incident.anchor_lng },
    }, client);
    if (responsibility.outcome !== "single" || responsibility.matches[0].institution.id !== incident.responsible_institution_id) {
      return { action: null, reason: "Configured responsibility is missing, ambiguous or changed." };
    }
  }
  // A null rule with an assigned institution is the existing official-selection path.
  const institution = await client.query("SELECT 1 FROM institutions WHERE id = $1", [incident.responsible_institution_id]);
  if (!institution.rowCount) return { action: null, reason: "The responsible institution is unavailable." };
  const payload = await getProposalPayload(client, incident.id);
  return {
    action: {
      id: `create_service_ticket:${incident.responsible_institution_id}`,
      institution_id: incident.responsible_institution_id, action: "create_service_ticket",
      payload_summary: payload.map((line) => `${line.key}: ${line.value}`).join("\n").slice(0, 1_000),
    },
    reason: null,
  };
}

export async function getAssessmentAction(ctx: ActorContext, incidentId: string) {
  requireDecisionMaker(ctx);
  return withTransaction(async (client) => {
    const incident = await findIncidentRow(client, incidentId, true);
    if (!incident) throw new ApiError(404, "not_found", "This incident does not exist.");
    return { incident_version: incident.version, ...await currentAssessmentAction(client, incident) };
  });
}

export async function markAssessmentReview(ctx: ActorContext, input: {
  incident_id: string; expected_incident_version: number; explanation: string;
}): Promise<"review" | "superseded"> {
  requireDecisionMaker(ctx);
  const explanation = input.explanation.trim().slice(0, 1_000);
  if (!explanation) throw new ApiError(400, "invalid_request", "A review explanation is required.");
  return withTransaction(async (client) => {
    const incident = await findIncidentRow(client, input.incident_id, true);
    if (!incident || incident.version !== input.expected_incident_version
      || !["new", "triaged"].includes(incident.response_status)
      || incident.review_reason === "ticket_rejected"
      || await hasProtectedProposal(client, incident)) return "superseded";
    const busy = await client.query("SELECT 1 FROM service_tickets WHERE incident_id = $1 AND status IN ('created', 'acknowledged', 'in_progress')", [incident.id]);
    if (busy.rowCount) return "superseded";
    await client.query(
      "UPDATE action_proposals SET state = 'superseded' WHERE incident_id = $1 AND state = 'pending' AND created_by = $2",
      [incident.id, RULE_BASED_PROPOSER],
    );
    await client.query(
      `UPDATE incidents SET review_reason = CASE WHEN urgent THEN 'urgent' ELSE 'assessment_review' END,
         review_note = $2, review_since = now(), updated_at = now() WHERE id = $1`,
      [incident.id, explanation],
    );
    await recordAudit(client, ctx, {
      operation: "assessment.review", entity_type: "incident", entity_id: incident.id,
      related: { incident_id: incident.id, incident_version: incident.version }, outcome: "review", reason: explanation,
    });
    return "review";
  });
}

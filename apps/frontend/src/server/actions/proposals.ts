import "server-only";

import type { PoolClient } from "pg";
import { z } from "zod";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { findIncidentRow, isUuid, type IncidentRow } from "@/server/incidents/incidents";
import { enqueueWork } from "@/server/jobs";
import { getProposalPayload, insertProposal, supersedeOpenProposals, type PayloadLine, type ProposalState } from "./proposal-lifecycle";
import { currentAssessmentAction, requireDecisionMaker } from "./assessment";

export interface ProposalRow {
  id: string;
  incident_id: string;
  version: number;
  incident_version: number;
  institution_id: string;
  action: "create_service_ticket";
  payload: PayloadLine[];
  evidence_ids: string[];
  explanation: string;
  state: ProposalState;
  created_by: string;
  created_at: Date;
  decided_by: string | null;
  decided_at: Date | null;
  decision_reason: string | null;
  approved_incident_version: number | null;
  execution_key: string;
  execution_attempts: number;
  execution_error: string | null;
  executed_at: Date | null;
}

export const PROPOSAL_COLUMNS = `id, incident_id, version, incident_version, institution_id, action, payload, evidence_ids,
  explanation, state, created_by, created_at, decided_by, decided_at, decision_reason, approved_incident_version,
  execution_key, execution_attempts, execution_error, executed_at`;

export async function findProposalRow(client: Pick<PoolClient, "query">, proposalId: string, lock = false): Promise<ProposalRow | null> {
  if (!isUuid(proposalId)) return null;
  const result = await client.query<ProposalRow>(
    `SELECT ${PROPOSAL_COLUMNS} FROM action_proposals WHERE id = $1${lock ? " FOR UPDATE" : ""}`,
    [proposalId],
  );
  return result.rows[0] ?? null;
}

const ACTIVE = ["new", "triaged"];

export async function hasActiveTicket(client: Pick<PoolClient, "query">, incidentId: string): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM service_tickets WHERE incident_id = $1 AND status IN ('created', 'acknowledged', 'in_progress')",
    [incidentId],
  );
  return Boolean(result.rowCount);
}

/** Shared preconditions for a new proposal on a locked incident. */
export async function assertCanPropose(client: PoolClient, incident: IncidentRow): Promise<void> {
  if (!ACTIVE.includes(incident.response_status) || (await hasActiveTicket(client, incident.id))) {
    throw new ApiError(409, "invalid_state", "This incident already has active work or is finished.");
  }
  const inFlight = await client.query(
    "SELECT state FROM action_proposals WHERE incident_id = $1 AND state IN ('executing', 'unknown')",
    [incident.id],
  );
  if (inFlight.rowCount) {
    throw new ApiError(409, "execution_unknown", "An earlier ticket is still being sent or its outcome is unknown. Reconcile it first.");
  }
}

export interface ProposeActionInput {
  incident_id: string;
  expected_incident_version: number;
  institution_id: string;
  explanation: string;
  payload?: PayloadLine[];
  evidence_ids: string[];
  assessment_key: string;
}

/**
 * `propose_action` for the bounded decision-maker: an immutable pending proposal and nothing
 * else. The destination must be the single institution the configured rules resolve to, and
 * every cited evidence item must be stored on the incident. Approval is a separate human command.
 */
export async function proposeAction(ctx: ActorContext, input: ProposeActionInput): Promise<{ proposal_id: string; version: number }> {
  requireDecisionMaker(ctx);
  const parsed = z.strictObject({
    incident_id: z.uuid(), expected_incident_version: z.number().int().positive().max(2_147_483_647),
    institution_id: z.string().min(1).max(200), explanation: z.string().trim().min(1).max(1_000),
    evidence_ids: z.array(z.uuid()).min(1).max(8).refine((ids) => new Set(ids).size === ids.length), assessment_key: z.string().min(1).max(300),
    payload: z.array(z.strictObject({ key: z.string().max(200), value: z.string().max(2_000) })).max(20).optional(),
  }).safeParse(input);
  if (!parsed.success || input.assessment_key !== `assess:incident:${input.incident_id.toLowerCase()}:v${input.expected_incident_version}`) {
    throw new ApiError(400, "invalid_request", "Supply a bounded assessment and its incident-version identity.");
  }
  input = parsed.data;
  return withTransaction(async (client) => {
    const incident = await findIncidentRow(client, input.incident_id, true);
    if (!incident) throw new ApiError(404, "not_found", "This incident does not exist.");
    const replay = await client.query<{ id: string; version: number }>(
      "SELECT id, version FROM action_proposals WHERE assessment_key = $1 AND incident_id = $2 AND incident_version = $3",
      [input.assessment_key, incident.id, input.expected_incident_version],
    );
    if (replay.rows[0]) return { proposal_id: replay.rows[0].id, version: replay.rows[0].version };
    if (incident.version !== input.expected_incident_version) {
      throw new ApiError(409, "version_conflict", "The incident changed. Read its current context before proposing.");
    }
    await assertCanPropose(client, incident);
    const eligibility = await currentAssessmentAction(client, incident);
    if (!eligibility.action || eligibility.action.institution_id !== input.institution_id) {
      throw new ApiError(409, "invalid_state", eligibility.reason ?? "The selected institution is no longer eligible.");
    }
    const payload = await getProposalPayload(client, incident.id);
    if (input.payload && JSON.stringify(input.payload) !== JSON.stringify(payload)) {
      throw new ApiError(400, "invalid_request", "The proposal payload must match the current server-owned payload.");
    }
    if (input.evidence_ids?.length) {
      const known = await client.query<{ id: string }>(
        "SELECT id FROM incident_evidence WHERE incident_id = $1 AND removed_at IS NULL AND id = ANY($2::uuid[])",
        [incident.id, input.evidence_ids.filter(isUuid)],
      );
      if (known.rowCount !== new Set(input.evidence_ids).size) {
        throw new ApiError(400, "invalid_request", "evidence_ids: cite only evidence stored on this incident.");
      }
    }
    await supersedeOpenProposals(client, incident.id);
    const proposal = await insertProposal(client, incident.id, {
      institution_id: input.institution_id,
      created_by: "Decision-maker agent",
      explanation: input.explanation,
      payload,
      evidence_ids: input.evidence_ids,
      assessment_key: input.assessment_key,
    });
    await recordAudit(client, ctx, {
      operation: "proposal.create",
      entity_type: "action_proposal",
      entity_id: proposal.id,
      related: { incident_id: incident.id, incident_version: incident.version, proposal_version: proposal.version, institution_id: input.institution_id },
      outcome: "pending",
    });
    return { proposal_id: proposal.id, version: proposal.version };
  });
}

export type ProposalDecisionInput =
  | { decision: "approved"; expected_proposal_version: number; expected_incident_version: number }
  | { decision: "rejected"; expected_proposal_version: number; expected_incident_version: number; reason: string };

function requireOfficial(ctx: ActorContext) {
  if (ctx.kind !== "session" || ctx.actor.role !== "official") {
    throw new ApiError(403, "forbidden", "Only an official can decide a proposal.");
  }
  return ctx.actor;
}

/**
 * The official's decision on exactly the proposal and incident versions they reviewed.
 * Approval is stored with both versions and queues one execution in the same transaction;
 * repeating it returns the current state and queues nothing. Rejection creates no ticket.
 */
export async function decideProposal(ctx: ActorContext, proposalId: string, decision: ProposalDecisionInput): Promise<ProposalRow> {
  const official = requireOfficial(ctx);
  return withTransaction(async (client) => {
    const proposal = await findProposalRow(client, proposalId, true);
    if (!proposal) throw new ApiError(404, "not_found", "This proposal does not exist.");
    const incident = await findIncidentRow(client, proposal.incident_id, true);
    if (!incident) throw new Error("A proposal lost its incident.");

    const sameVersions = decision.expected_proposal_version === proposal.version
      && decision.expected_incident_version === proposal.incident_version;
    if (decision.decision === "approved" && sameVersions && ["approved", "executing", "executed"].includes(proposal.state)) {
      return proposal;
    }
    if (proposal.state === "superseded") {
      throw new ApiError(409, "stale_approval", "This proposal was replaced after the incident changed. Review the current proposal.");
    }
    if (proposal.state === "unknown") {
      throw new ApiError(409, "execution_unknown", "The outcome of sending this ticket is unknown. Reconcile it before deciding again.");
    }
    if (proposal.state !== "pending") {
      throw new ApiError(409, "proposal_closed", "This proposal has already been decided.");
    }
    if (!sameVersions || incident.version !== proposal.incident_version) {
      throw new ApiError(409, "stale_approval", "The incident changed after this proposal was prepared. Review the current proposal.");
    }

    if (decision.decision === "rejected") {
      await client.query(
        "UPDATE action_proposals SET state = 'rejected', decided_by = $1, decided_at = now(), decision_reason = $2 WHERE id = $3",
        [official.id, decision.reason, proposal.id],
      );
      await client.query(
        `UPDATE incidents SET review_reason = 'needs_responsibility', review_note = $1, review_since = now(), updated_at = now() WHERE id = $2`,
        [`Proposal rejected: ${decision.reason}`, incident.id],
      );
    } else {
      // Approval does not change the incident version; it binds the one that was reviewed.
      await client.query(
        `UPDATE action_proposals SET state = 'approved', decided_by = $1, decided_at = now(), approved_incident_version = $2 WHERE id = $3`,
        [official.id, incident.version, proposal.id],
      );
      await client.query(
        "UPDATE incidents SET review_reason = NULL, review_note = NULL, review_since = NULL, updated_at = now() WHERE id = $1",
        [incident.id],
      );
      await enqueueWork(client, {
        kind: "execute",
        source: { type: "action_proposal", id: proposal.id, version: proposal.version },
        idempotency_key: proposal.execution_key,
        correlation_id: ctx.correlation_id,
      });
    }
    await recordAudit(client, ctx, {
      operation: decision.decision === "approved" ? "proposal.approve" : "proposal.reject",
      entity_type: "action_proposal",
      entity_id: proposal.id,
      related: { incident_id: incident.id, incident_version: incident.version, proposal_version: proposal.version, institution_id: proposal.institution_id },
      outcome: decision.decision,
      reason: decision.decision === "rejected" ? decision.reason : null,
    });
    return (await findProposalRow(client, proposal.id))!;
  });
}

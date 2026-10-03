import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { addIncidentEvent, bumpIncidentVersion, findIncidentRow } from "@/server/incidents/incidents";
import { enqueueIncidentIndex } from "@/server/incidents/work";
import { lookupConnectorRequest, sendToConnector, type ConnectorResult } from "@/server/institutions/demo-connector";
import { findProposalRow, hasActiveTicket, type ProposalRow } from "./proposals";

export type ExecutionOutcome =
  | { status: "executed"; ticket_id: string; ticket_reference: string; replayed: boolean }
  | { status: "failed"; reason: string }
  | { status: "unknown" }
  | { status: "stale"; detail: string };

type Claim = { proposal: ProposalRow; resumed: boolean } | ExecutionOutcome;

async function ticketOf(client: Pick<PoolClient, "query">, proposalId: string) {
  const result = await client.query<{ id: string; reference: string }>(
    "SELECT id, reference FROM service_tickets WHERE proposal_id = $1",
    [proposalId],
  );
  return result.rows[0] ?? null;
}

/** Step 1: validate the approval against current versions and claim the action atomically. */
async function claim(proposalId: string): Promise<Claim> {
  return withTransaction(async (client) => {
    const proposal = await findProposalRow(client, proposalId, true);
    if (!proposal) throw new ApiError(404, "not_found", "This proposal does not exist.");

    // A successful execution is replayed before anything else, whatever happened to the incident since.
    if (proposal.state === "executed") {
      const ticket = await ticketOf(client, proposal.id);
      if (!ticket) throw new Error("An executed proposal lost its ticket.");
      return { status: "executed", ticket_id: ticket.id, ticket_reference: ticket.reference, replayed: true };
    }
    if (proposal.state === "unknown") return { status: "unknown" };
    if (!["approved", "failed", "executing"].includes(proposal.state) || proposal.approved_incident_version === null) {
      return { status: "stale", detail: `The proposal is ${proposal.state}; there is no current approval to execute.` };
    }

    const incident = await findIncidentRow(client, proposal.incident_id, true);
    if (!incident) throw new Error("A proposal lost its incident.");
    if (proposal.state !== "executing") {
      if (incident.version !== proposal.approved_incident_version || (await hasActiveTicket(client, incident.id))) {
        await client.query("UPDATE action_proposals SET state = 'superseded' WHERE id = $1", [proposal.id]);
        return { status: "stale", detail: "The incident changed after approval. A fresh proposal needs review." };
      }
    }
    await client.query(
      "UPDATE action_proposals SET state = 'executing', execution_attempts = execution_attempts + 1 WHERE id = $1",
      [proposal.id],
    );
    // An interrupted earlier attempt may already have reached the institution: look before sending.
    return { proposal, resumed: proposal.state === "executing" };
  });
}

/**
 * Step 3: record what the connector said. A created request becomes the incident's one ticket
 * and its own `assigned` transition; the copied payload is the approved one, never a new one.
 */
export async function recordExecutionResult(ctx: ActorContext, proposalId: string, result: ConnectorResult): Promise<ExecutionOutcome> {
  return withTransaction(async (client) => {
    const proposal = await findProposalRow(client, proposalId, true);
    if (!proposal) throw new ApiError(404, "not_found", "This proposal does not exist.");
    const related = { incident_id: proposal.incident_id, proposal_version: proposal.version, institution_id: proposal.institution_id };

    if (result.outcome === "failed") {
      await client.query("UPDATE action_proposals SET state = 'failed', execution_error = $1 WHERE id = $2", [result.reason, proposal.id]);
      await client.query(
        `UPDATE incidents SET review_reason = 'needs_responsibility', review_note = $1, review_since = now(), updated_at = now() WHERE id = $2`,
        [`Sending the ticket failed: ${result.reason} No ticket exists.`, proposal.incident_id],
      );
      await recordAudit(client, ctx, { operation: "proposal.execute", entity_type: "action_proposal", entity_id: proposal.id, related, outcome: "failed", reason: result.reason });
      return { status: "failed", reason: result.reason };
    }
    if (result.outcome === "unknown") {
      const note = "The institution did not answer in time. It is unknown whether the ticket exists; reconcile before sending again.";
      await client.query("UPDATE action_proposals SET state = 'unknown', execution_error = $1 WHERE id = $2", [note, proposal.id]);
      await client.query(
        `UPDATE incidents SET review_reason = 'needs_responsibility', review_note = $1, review_since = now(), updated_at = now() WHERE id = $2`,
        [note, proposal.incident_id],
      );
      await recordAudit(client, ctx, { operation: "proposal.execute", entity_type: "action_proposal", entity_id: proposal.id, related, outcome: "unknown" });
      return { status: "unknown" };
    }

    const existing = await ticketOf(client, proposal.id);
    if (existing) return { status: "executed", ticket_id: existing.id, ticket_reference: existing.reference, replayed: true };

    const incident = await findIncidentRow(client, proposal.incident_id, true);
    if (!incident) throw new Error("A proposal lost its incident.");
    const ticket = await client.query<{ id: string; reference: string }>(
      `INSERT INTO service_tickets (reference, incident_id, proposal_id, institution_id, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, reference`,
      [result.external_reference, incident.id, proposal.id, proposal.institution_id, JSON.stringify(proposal.payload)],
    );
    await client.query("INSERT INTO service_ticket_events (ticket_id, status) VALUES ($1, 'created')", [ticket.rows[0].id]);
    await client.query(
      "UPDATE action_proposals SET state = 'executed', executed_at = now(), execution_error = NULL WHERE id = $1",
      [proposal.id],
    );
    await client.query(
      `UPDATE incidents SET response_status = 'assigned', responsible_institution_id = $1,
              review_reason = NULL, review_note = NULL, review_since = NULL WHERE id = $2`,
      [proposal.institution_id, incident.id],
    );
    await addIncidentEvent(client, incident.id, "assigned");
    const version = await bumpIncidentVersion(client, incident.id);
    await recordAudit(client, ctx, {
      operation: "proposal.execute",
      entity_type: "action_proposal",
      entity_id: proposal.id,
      related: { ...related, ticket_id: ticket.rows[0].id, ticket_reference: ticket.rows[0].reference },
      outcome: "executed",
    });
    await enqueueIncidentIndex(client, { id: incident.id, version: version! }, ctx.correlation_id);
    return { status: "executed", ticket_id: ticket.rows[0].id, ticket_reference: ticket.rows[0].reference, replayed: false };
  });
}

/**
 * Trusted executor. Its only input is the approved proposal's ID: destination and payload come
 * from the stored proposal. There is no HTTP route for it; the worker invokes it.
 */
export async function executeApprovedProposal(ctx: ActorContext, proposalId: string): Promise<ExecutionOutcome> {
  if (ctx.kind !== "system" || ctx.principal !== "executor") {
    throw new ApiError(403, "forbidden", "Only the trusted executor can execute an approved proposal.");
  }
  const claimed = await claim(proposalId);
  if ("status" in claimed) return claimed;

  const { proposal, resumed } = claimed;
  // Step 2, outside any database transaction: the institution call.
  const earlier = resumed ? await lookupConnectorRequest(proposal.execution_key) : null;
  const result: ConnectorResult = earlier
    ? { outcome: "created", external_reference: earlier }
    : await sendToConnector(proposal.execution_key, proposal.institution_id, proposal.payload);
  return recordExecutionResult(ctx, proposal.id, result);
}

/**
 * Official reconciliation of an unknown outcome: look the execution key up at the institution.
 * Found: the existing request becomes the ticket. Not found: a known no-effect failure, and a
 * fresh proposal may be reviewed. Nothing is resent here.
 */
export async function reconcileExecution(
  ctx: ActorContext,
  proposalId: string,
  input: { expected_proposal_version: number; reason: string },
): Promise<ExecutionOutcome> {
  if (ctx.kind !== "session" || ctx.actor.role !== "official") {
    throw new ApiError(403, "forbidden", "Only an official can reconcile an execution.");
  }
  const proposal = await findProposalRow(getPool(), proposalId);
  if (!proposal) throw new ApiError(404, "not_found", "This proposal does not exist.");
  if (proposal.version !== input.expected_proposal_version) {
    throw new ApiError(409, "version_conflict", "This is not the current proposal. Refresh and review again.");
  }
  if (proposal.state !== "unknown") {
    throw new ApiError(409, "invalid_state", "Only a proposal with an unknown outcome can be reconciled.");
  }
  const reference = await lookupConnectorRequest(proposal.execution_key);
  const outcome = await recordExecutionResult(
    ctx,
    proposal.id,
    reference
      ? { outcome: "created", external_reference: reference }
      : { outcome: "failed", reason: "Reconciled: the institution has no request for this ticket." },
  );
  await withTransaction((client) => recordAudit(client, ctx, {
    operation: "proposal.reconcile",
    entity_type: "action_proposal",
    entity_id: proposal.id,
    related: { incident_id: proposal.incident_id, proposal_version: proposal.version },
    outcome: outcome.status,
    reason: input.reason,
  }));
  return outcome;
}

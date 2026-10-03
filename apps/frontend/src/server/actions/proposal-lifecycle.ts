import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDecisionProvider } from "@/server/agents/config";
import { enqueueWork } from "@/server/jobs";

/*
 * Rules that tie proposals to their incident. Kept free of other domain imports so the
 * incident module can call it on every material change.
 */

export type ProposalState =
  | "pending" | "approved" | "rejected" | "executing" | "executed" | "failed" | "unknown" | "superseded";

export type PayloadLine = { key: string; value: string };

export const RULE_BASED_PROPOSER = "Rule-based proposer (demo)";

interface IncidentFacts {
  id: string;
  version: number;
  title: string;
  public_label: string;
  district: string | null;
  assessment: string;
  response_status: string;
  support_count: number;
  responsible_institution_id: string | null;
  responsibility_rule_id: string | null;
  review_reason: string | null;
}

async function loadFacts(client: PoolClient, incidentId: string): Promise<IncidentFacts> {
  const result = await client.query<IncidentFacts>(
    `SELECT id, version, title, public_label, district, assessment, response_status, support_count,
            responsible_institution_id, responsibility_rule_id, review_reason
     FROM incidents WHERE id = $1`,
    [incidentId],
  );
  return result.rows[0];
}

async function currentEvidence(client: PoolClient, incidentId: string): Promise<{ id: string; label: string }[]> {
  const result = await client.query<{ id: string; label: string }>(
    `SELECT id, label FROM incident_evidence
     WHERE incident_id = $1 AND removed_at IS NULL AND state <> 'missing' ORDER BY retrieved_at, id`,
    [incidentId],
  );
  return result.rows;
}

/** Exactly what the institution will receive: incident-level facts only, no reporter or unit detail. */
function buildPayload(incident: IncidentFacts, evidenceCount: number): PayloadLine[] {
  return [
    { key: "Issue", value: incident.title },
    { key: "Area", value: [incident.public_label, incident.district].filter(Boolean).join(", ") },
    { key: "Residents reporting", value: `${incident.support_count} (demo identities, unverified)` },
    { key: "City assessment", value: incident.assessment },
    { key: "Evidence items", value: String(evidenceCount) },
  ];
}

export async function getProposalPayload(client: PoolClient, incidentId: string): Promise<PayloadLine[]> {
  const incident = await loadFacts(client, incidentId);
  return buildPayload(incident, (await currentEvidence(client, incidentId)).length);
}

/** An incident or payload change makes an undecided or unexecuted proposal stale. */
export async function supersedeOpenProposals(client: PoolClient, incidentId: string): Promise<number> {
  const result = await client.query(
    "UPDATE action_proposals SET state = 'superseded' WHERE incident_id = $1 AND state IN ('pending', 'approved')",
    [incidentId],
  );
  return result.rowCount ?? 0;
}

export interface NewProposal {
  institution_id: string;
  created_by: string;
  explanation: string;
  payload?: PayloadLine[];
  evidence_ids?: string[];
  assessment_key?: string;
}

/** Inserts an immutable pending proposal bound to the incident's current version. Creates no ticket. */
export async function insertProposal(client: PoolClient, incidentId: string, input: NewProposal): Promise<{ id: string; version: number }> {
  const incident = await loadFacts(client, incidentId);
  const evidence = await currentEvidence(client, incidentId);
  const id = randomUUID();
  const inserted = await client.query<{ version: number }>(
    `INSERT INTO action_proposals
       (id, incident_id, version, incident_version, institution_id, action, payload, evidence_ids, explanation,
        created_by, execution_key, assessment_key)
     VALUES ($1, $2, (SELECT coalesce(max(version), 0) + 1 FROM action_proposals WHERE incident_id = $2), $3, $4,
             'create_service_ticket', $5, $6::uuid[], $7, $8, $9, $10)
     RETURNING version`,
    [
      id, incidentId, incident.version, input.institution_id,
      JSON.stringify(input.payload ?? buildPayload(incident, evidence.length)),
      input.evidence_ids ?? evidence.map((item) => item.id), input.explanation, input.created_by,
      `execute:proposal:${id}`, input.assessment_key ?? null,
    ],
  );
  await client.query(
    `UPDATE incidents SET review_reason = 'proposal_ready', review_note = $1, review_since = now() WHERE id = $2`,
    ["A ticket proposal is ready for your decision.", incidentId],
  );
  return { id, version: inserted.rows[0].version };
}

/**
 * Runs inside every material incident change, after the version was incremented: unexecuted
 * proposals are superseded and, where one configured institution is responsible and nothing
 * is in flight, a fresh rule-based proposal is prepared for the new version.
 */
export async function afterIncidentChange(client: PoolClient, incidentId: string, options: { propose: boolean }): Promise<void> {
  const superseded = await supersedeOpenProposals(client, incidentId);
  if (!options.propose) return;

  const incident = await loadFacts(client, incidentId);
  if (getDecisionProvider() === "scaleway" && ["new", "triaged"].includes(incident.response_status)) {
    const key = `assess:incident:${incident.id}:v${incident.version}`;
    await enqueueWork(client, {
      kind: "assess", source: { type: "incident", id: incident.id, version: incident.version },
      idempotency_key: key, correlation_id: key,
    });
    await client.query(
      `UPDATE incidents SET review_reason = CASE WHEN review_reason IN ('urgent', 'ticket_rejected')
         THEN review_reason ELSE 'assessment_pending' END,
         review_note = CASE WHEN review_reason IN ('urgent', 'ticket_rejected') THEN review_note
           ELSE 'Decision assessment is queued. An official can review this incident at any time.' END,
         review_since = coalesce(review_since, now()) WHERE id = $1`, [incident.id],
    );
    return;
  }
  if (!incident.responsible_institution_id || !["new", "triaged"].includes(incident.response_status)) return;
  if (incident.review_reason === "ticket_rejected") return;
  const busy = await client.query(
    `SELECT 1 FROM action_proposals WHERE incident_id = $1 AND state IN ('executing', 'unknown')
     UNION ALL
     SELECT 1 FROM service_tickets WHERE incident_id = $1 AND status IN ('created', 'acknowledged', 'in_progress')
     LIMIT 1`,
    [incidentId],
  );
  if (busy.rowCount) return;

  await insertProposal(client, incidentId, {
    institution_id: incident.responsible_institution_id,
    created_by: RULE_BASED_PROPOSER,
    explanation: superseded
      ? "Updated after the incident changed; replaces the earlier proposal. Prepared from the configured demo responsibility rule, without a language model."
      : `Prepared from the configured demo responsibility rule${incident.responsibility_rule_id ? ` ${incident.responsibility_rule_id}` : ""}, without a language model.`,
  });
}

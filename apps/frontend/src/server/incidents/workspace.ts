import "server-only";

import type { ActorContext } from "@/server/actor-context";
import type {
  EvidenceDto, HistoryDto, IncidentDto, InstitutionDto, OperationsReportDto, ProposalDto, TicketDto, WorkspaceDto,
} from "@/api/operations/types";
import { PROPOSAL_COLUMNS, type ProposalRow } from "@/server/actions/proposals";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { REPORT_COLUMNS, type ReportRow } from "@/server/reports/reports";
import { INCIDENT_COLUMNS, isUuid, type IncidentRow } from "./incidents";
import { TRIAGE_POLICY } from "./triage-policy";

/* The official's private view, in the wire shape the /operations screen already uses. */

const INCIDENT_LIMIT = 300;
const REPORT_LIMIT = 600;
/** After this long without automatic triage, a pending report is offered for manual triage. */
const PENDING_REVIEW_MS = 60_000;

const ACTOR_LABEL: Record<string, string> = {
  official: "Official (demo account)",
  institution: "Institution (demo account)",
  resident: "Resident",
  triage: "Automatic triage",
  decision_maker: "Decision-maker agent",
  executor: "Executor",
  seed: "Demo fixture",
};

const OPERATION_LABEL: Record<string, string> = {
  "incident.create": "Created incident",
  "incident.contribute": "Resident is affected too",
  "incident.unlink_report": "Removed a report link",
  "incident.choose_institution": "Chose responsible institution",
  "incident.verify": "Verified",
  "incident.dispute": "Disputed",
  "incident.close": "Closed",
  "incident.reopen": "Reopened",
  "report.triage": "Triaged a report",
  "report.link": "Linked a report",
  "report.new_incident": "Started this incident from a report",
  "proposal.create": "Proposed a ticket",
  "proposal.approve": "Approved the proposal",
  "proposal.reject": "Rejected the proposal",
  "proposal.execute": "Sent the ticket",
  "proposal.reconcile": "Reconciled the ticket outcome",
  "ticket.update": "Institution updated the ticket",
  "demo.fixtures": "Seeded as demo data",
};

function requireOfficial(ctx: ActorContext) {
  if (ctx.kind !== "session" || ctx.actor.role !== "official") {
    throw new ApiError(403, "forbidden", "Only an official can open the operations workspace.");
  }
}

function proposalDto(row: ProposalRow): ProposalDto {
  return {
    id: row.id,
    version: row.version,
    incident_version: row.incident_version,
    institution_id: row.institution_id,
    action: row.action,
    payload: row.payload,
    evidence_ids: row.evidence_ids,
    explanation: row.explanation,
    state: row.state,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    decided_by: row.decided_by ? ACTOR_LABEL.official : null,
    decided_at: row.decided_at ? row.decided_at.toISOString() : null,
    reason: row.decision_reason,
    execution_error: row.execution_error,
  };
}

function reportDto(row: ReportRow & { review_reason: string | null; review_note: string | null; review_since: Date | null; review_candidates: OperationsReportDto["review"] extends infer R ? R extends { candidates: infer C } ? C : never : never }, now: number): OperationsReportDto {
  const waiting = row.triage_state === "pending" && now - row.submitted_at.getTime() > PENDING_REVIEW_MS;
  const review: OperationsReportDto["review"] = row.review_reason
    ? {
        reason: row.review_reason as NonNullable<OperationsReportDto["review"]>["reason"],
        note: row.review_note ?? "",
        since: (row.review_since ?? row.submitted_at).toISOString(),
        candidates: row.review_candidates ?? [],
      }
    : waiting
      ? {
          reason: "pending_triage",
          note: "Automatic triage has not processed this report yet. You can triage it by hand.",
          since: row.submitted_at.toISOString(),
          candidates: [],
        }
      : null;
  return {
    id: row.id,
    reference: row.reference,
    channel: row.channel,
    category_id: row.category_id,
    issue_type: row.issue_type,
    scope: row.scope,
    urgent: row.urgent,
    summary: row.summary,
    observed_at: row.observed_at ? row.observed_at.toISOString() : null,
    submitted_at: row.submitted_at.toISOString(),
    lat: row.lat,
    lng: row.lng,
    address: row.location_label,
    unit: row.unit,
    triage_state: row.triage_state,
    incident_id: row.incident_id,
    version: row.version,
    review,
  };
}

async function loadIncidentParts(ids: string[]) {
  const pool = getPool();
  const [evidence, proposals, tickets, ticketEvents, history, links] = await Promise.all([
    pool.query<{
      id: string; incident_id: string; kind: EvidenceDto["kind"]; label: string; source: string; observed_at: Date | null;
      retrieved_at: Date; provenance: EvidenceDto["provenance"]; state: EvidenceDto["state"]; note: string | null;
    }>(
      `SELECT id, incident_id, kind, label, source, observed_at, retrieved_at, provenance, state, note
       FROM incident_evidence WHERE incident_id = ANY($1::uuid[]) AND removed_at IS NULL ORDER BY retrieved_at, id`,
      [ids],
    ),
    pool.query<ProposalRow>(
      `SELECT DISTINCT ON (incident_id) ${PROPOSAL_COLUMNS} FROM action_proposals
       WHERE incident_id = ANY($1::uuid[]) ORDER BY incident_id, version DESC`,
      [ids],
    ),
    pool.query<{
      id: string; incident_id: string; reference: string; institution_id: string; status: TicketDto["status"];
      expected_resolution_at: Date | null; version: number;
    }>(
      `SELECT DISTINCT ON (incident_id) id, incident_id, reference, institution_id, status, expected_resolution_at, version
       FROM service_tickets WHERE incident_id = ANY($1::uuid[]) ORDER BY incident_id, created_at DESC`,
      [ids],
    ),
    pool.query<{ ticket_id: string; status: TicketDto["status"]; note: string | null; occurred_at: Date }>(
      `SELECT e.ticket_id, e.status, e.note, e.occurred_at FROM service_ticket_events e
       JOIN service_tickets t ON t.id = e.ticket_id WHERE t.incident_id = ANY($1::uuid[]) ORDER BY e.occurred_at, e.id`,
      [ids],
    ),
    pool.query<{ id: string; incident_id: string; occurred_at: Date; actor_role: string; operation: string; reason: string | null }>(
      `SELECT id, CASE WHEN entity_type = 'incident' THEN entity_id::text ELSE related->>'incident_id' END AS incident_id,
              occurred_at, actor_role, operation, reason
       FROM audit_events
       WHERE (entity_type = 'incident' AND entity_id = ANY($1::uuid[])) OR related->>'incident_id' = ANY($2::text[])
       ORDER BY occurred_at, id`,
      [ids, ids],
    ),
    pool.query<{ incident_id: string; id: string }>(
      "SELECT incident_id, id FROM reports WHERE incident_id = ANY($1::uuid[]) ORDER BY submitted_at",
      [ids],
    ),
  ]);
  return { evidence: evidence.rows, proposals: proposals.rows, tickets: tickets.rows, ticketEvents: ticketEvents.rows, history: history.rows, links: links.rows };
}

function incidentDto(row: IncidentRow, parts: Awaited<ReturnType<typeof loadIncidentParts>>): IncidentDto {
  const proposal = parts.proposals.find((item) => item.incident_id === row.id);
  const ticket = parts.tickets.find((item) => item.incident_id === row.id);
  const seen = new Set<string>();
  const history: HistoryDto[] = parts.history
    .filter((event) => event.incident_id === row.id && !seen.has(event.id) && seen.add(event.id))
    .map((event) => ({
      id: event.id,
      at: event.occurred_at.toISOString(),
      actor: ACTOR_LABEL[event.actor_role] ?? event.actor_role,
      action: OPERATION_LABEL[event.operation] ?? event.operation,
      detail: event.reason,
    }));
  return {
    id: row.id,
    reference: row.reference,
    category_id: row.category_id,
    issue_type: row.issue_type,
    title: row.title,
    lat: row.anchor_lat,
    lng: row.anchor_lng,
    address: row.public_label,
    district: row.district,
    matching_radius_m: TRIAGE_POLICY.radius_m,
    assessment: row.assessment,
    response_status: row.response_status,
    version: row.version,
    support_count: row.support_count,
    urgent: row.urgent,
    review: row.review_reason
      ? {
          reason: row.review_reason as NonNullable<IncidentDto["review"]>["reason"],
          note: row.review_note ?? "",
          since: (row.review_since ?? row.updated_at).toISOString(),
        }
      : null,
    report_ids: parts.links.filter((link) => link.incident_id === row.id).map((link) => link.id),
    evidence: parts.evidence
      .filter((item) => item.incident_id === row.id)
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        source: item.source,
        observed_at: item.observed_at ? item.observed_at.toISOString() : null,
        retrieved_at: item.retrieved_at.toISOString(),
        provenance: item.provenance,
        state: item.state,
        note: item.note,
      })),
    proposal: proposal ? proposalDto(proposal) : null,
    ticket: ticket
      ? {
          id: ticket.id,
          reference: ticket.reference,
          institution_id: ticket.institution_id,
          status: ticket.status,
          version: ticket.version,
          expected_resolution_at: ticket.expected_resolution_at ? ticket.expected_resolution_at.toISOString() : null,
          events: parts.ticketEvents
            .filter((event) => event.ticket_id === ticket.id)
            .map((event) => ({ status: event.status, at: event.occurred_at.toISOString(), note: event.note })),
        }
      : null,
    history,
    updated_at: row.updated_at.toISOString(),
  };
}

async function listInstitutions(): Promise<InstitutionDto[]> {
  const result = await getPool().query<{ id: string; name: string; is_demo: boolean; category_ids: string[] | null }>(
    `SELECT i.id, i.name, i.is_demo, array_agg(DISTINCT r.category_id) FILTER (WHERE r.category_id IS NOT NULL) AS category_ids
     FROM institutions i LEFT JOIN responsibility_rules r ON r.institution_id = i.id
     GROUP BY i.id ORDER BY i.name`,
  );
  return result.rows.map((row) => ({ id: row.id, name: row.name, category_ids: row.category_ids ?? [], is_demo: row.is_demo }));
}

/** Review queue, incidents, staff-visible reports and institutions. Official session only. */
export async function getWorkspace(ctx: ActorContext): Promise<WorkspaceDto> {
  requireOfficial(ctx);
  const pool = getPool();
  const incidents = await pool.query<IncidentRow>(
    `SELECT ${INCIDENT_COLUMNS} FROM incidents ORDER BY updated_at DESC LIMIT $1`,
    [INCIDENT_LIMIT],
  );
  const ids = incidents.rows.map((row) => row.id);
  const reports = await pool.query<Parameters<typeof reportDto>[0]>(
    `SELECT ${REPORT_COLUMNS}, review_reason, review_note, review_since, review_candidates FROM reports
     WHERE incident_id = ANY($1::uuid[]) OR triage_state IN ('pending', 'needs_review')
     ORDER BY submitted_at DESC LIMIT $2`,
    [ids, REPORT_LIMIT],
  );
  const parts = await loadIncidentParts(ids);
  const now = Date.now();
  return {
    source: "demo",
    generated_at: new Date(now).toISOString(),
    institutions: await listInstitutions(),
    incidents: incidents.rows.map((row) => incidentDto(row, parts)),
    reports: reports.rows.map((row) => reportDto(row, now)),
  };
}

/** One incident's private detail for an official. */
export async function getOfficialIncident(ctx: ActorContext, incidentId: string): Promise<IncidentDto> {
  requireOfficial(ctx);
  if (!isUuid(incidentId)) throw new ApiError(404, "not_found", "This incident does not exist.");
  const result = await getPool().query<IncidentRow>(`SELECT ${INCIDENT_COLUMNS} FROM incidents WHERE id = $1`, [incidentId]);
  if (!result.rows[0]) throw new ApiError(404, "not_found", "This incident does not exist.");
  return incidentDto(result.rows[0], await loadIncidentParts([incidentId]));
}

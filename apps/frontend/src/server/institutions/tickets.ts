import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { addIncidentEvent, bumpIncidentVersion, findIncidentRow, isUuid } from "@/server/incidents/incidents";
import { publicSummary, type TimelineKind } from "@/server/incidents/public-templates";
import { enqueueIncidentIndex } from "@/server/incidents/work";
import { enqueueWork } from "@/server/jobs";

/*
 * An institution's own tickets. The institution always comes from the signed-in account
 * (or the server credential of a tool adapter), never from a request field; another
 * institution's ticket is indistinguishable from a missing one.
 */

export const TICKET_STATUSES = ["created", "acknowledged", "in_progress", "resolved", "rejected"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Minimum incident context plus the approved payload. No reporter, narrative, unit or official note. */
export interface InstitutionTicket {
  id: string;
  reference: string;
  institution_id: string;
  status: TicketStatus;
  version: number;
  payload: { key: string; value: string }[];
  incident: {
    id: string; reference: string; category_id: string; issue_type: string; public_summary: string;
    public_location: { lat: number; lng: number; label: string; precision: "street" | "building" };
  };
  expected_resolution_at: string | null;
  result_note: string | null;
  events: { status: TicketStatus; at: string; note: string | null }[];
  created_at: string;
  updated_at: string;
  provenance: "demo";
}

interface TicketRow {
  id: string; reference: string; institution_id: string; incident_id: string; status: TicketStatus; version: number;
  payload: { key: string; value: string }[]; expected_resolution_at: Date | null; result_note: string | null;
  created_at: Date; updated_at: Date;
  incident_reference: string; category_id: string; issue_type: string; public_label: string;
  public_precision: "street" | "building"; scope: "building" | "street"; anchor_lat: number; anchor_lng: number;
}

const TICKET_SELECT = `
  SELECT t.id, t.reference, t.institution_id, t.incident_id, t.status, t.version, t.payload, t.expected_resolution_at,
         t.result_note, t.created_at, t.updated_at, i.reference AS incident_reference, i.category_id, i.issue_type,
         i.public_label, i.public_precision, i.scope, i.anchor_lat, i.anchor_lng
  FROM service_tickets t JOIN incidents i ON i.id = t.incident_id`;

/** What an institution may do next. Nothing goes backwards; rejection is only possible before work starts. */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  created: ["acknowledged", "rejected"],
  acknowledged: ["in_progress", "rejected"],
  in_progress: ["resolved"],
  resolved: [],
  rejected: [],
};

function requireInstitution(ctx: ActorContext): string {
  if (ctx.kind !== "session" || ctx.actor.role !== "institution" || !ctx.actor.institution_id) {
    throw new ApiError(403, "forbidden", "Only an institution account can use its ticket inbox.");
  }
  return ctx.actor.institution_id;
}

const notFound = () => new ApiError(404, "not_found", "This ticket does not exist or is not assigned to your institution.");

async function project(client: Pick<PoolClient, "query">, rows: TicketRow[]): Promise<InstitutionTicket[]> {
  if (!rows.length) return [];
  const events = await client.query<{ ticket_id: string; status: TicketStatus; note: string | null; occurred_at: Date }>(
    "SELECT ticket_id, status, note, occurred_at FROM service_ticket_events WHERE ticket_id = ANY($1::uuid[]) ORDER BY occurred_at, id",
    [rows.map((row) => row.id)],
  );
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    institution_id: row.institution_id,
    status: row.status,
    version: row.version,
    payload: row.payload,
    incident: {
      id: row.incident_id,
      reference: row.incident_reference,
      category_id: row.category_id,
      issue_type: row.issue_type,
      public_summary: publicSummary(row.issue_type, row.public_label, row.scope),
      public_location: { lat: row.anchor_lat, lng: row.anchor_lng, label: row.public_label, precision: row.public_precision },
    },
    expected_resolution_at: row.expected_resolution_at ? row.expected_resolution_at.toISOString() : null,
    result_note: row.result_note,
    events: events.rows
      .filter((event) => event.ticket_id === row.id)
      .map((event) => ({ status: event.status, at: event.occurred_at.toISOString(), note: event.note })),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    provenance: "demo",
  }));
}

function decodeCursor(cursor: string | null): { updated_at: string; id: string } | null {
  if (!cursor) return null;
  try {
    const [updatedAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (Number.isNaN(Date.parse(updatedAt)) || !isUuid(id)) throw new Error("bad cursor");
    return { updated_at: updatedAt, id };
  } catch {
    throw new ApiError(400, "invalid_request", "cursor: not a cursor returned by this endpoint.");
  }
}

export async function listTickets(
  ctx: ActorContext,
  filters: { statuses: TicketStatus[]; limit: number; cursor: string | null },
): Promise<{ items: InstitutionTicket[]; next_cursor: string | null }> {
  const institutionId = requireInstitution(ctx);
  const cursor = decodeCursor(filters.cursor);
  const pool = getPool();
  const result = await pool.query<TicketRow & { cursor_updated_at: string }>(
    `${TICKET_SELECT.replace("SELECT", "SELECT to_char(t.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cursor_updated_at,")}
     WHERE t.institution_id = $1
       AND (cardinality($2::text[]) = 0 OR t.status = ANY($2))
       AND ($3::timestamptz IS NULL OR (t.updated_at, t.id) < ($3::timestamptz, $4::uuid))
     ORDER BY t.updated_at DESC, t.id DESC LIMIT $5`,
    [institutionId, filters.statuses, cursor?.updated_at ?? null, cursor?.id ?? null, filters.limit + 1],
  );
  const page = result.rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  return {
    items: await project(pool, page),
    next_cursor: result.rows.length > filters.limit && last
      ? Buffer.from(`${last.cursor_updated_at}|${last.id}`, "utf8").toString("base64url")
      : null,
  };
}

async function loadScoped(client: Pick<PoolClient, "query">, institutionId: string, ticketId: string, lock = false): Promise<TicketRow> {
  if (!isUuid(ticketId)) throw notFound();
  const result = await client.query<TicketRow>(
    `${TICKET_SELECT} WHERE t.id = $1 AND t.institution_id = $2${lock ? " FOR UPDATE OF t" : ""}`,
    [ticketId, institutionId],
  );
  if (!result.rows[0]) throw notFound();
  return result.rows[0];
}

/** `get_service_ticket`: one assigned ticket. */
export async function getServiceTicket(ctx: ActorContext, ticketId: string): Promise<InstitutionTicket> {
  const institutionId = requireInstitution(ctx);
  return (await project(getPool(), [await loadScoped(getPool(), institutionId, ticketId)]))[0];
}

export interface TicketUpdate {
  status: Exclude<TicketStatus, "created">;
  expected_version: number;
  note?: string;
  expected_resolution_at?: string | null;
}

const PUBLIC_EVENT: Record<TicketUpdate["status"], TimelineKind> = {
  acknowledged: "acknowledged",
  in_progress: "work_started",
  resolved: "resolved",
  rejected: "returned_to_review",
};

/**
 * `update_service_ticket`: one legal step forward against the version the operator saw. The
 * ticket, its incident, the public timeline event, the audit record and the index work commit
 * together; the institution's note stays on the ticket and never reaches the public timeline.
 */
export async function updateServiceTicket(ctx: ActorContext, ticketId: string, update: TicketUpdate): Promise<InstitutionTicket> {
  const institutionId = requireInstitution(ctx);
  const note = update.note?.trim() || null;
  if ((update.status === "resolved" || update.status === "rejected") && (!note || note.length < 3)) {
    throw new ApiError(400, "invalid_request", `note: say ${update.status === "resolved" ? "what was done" : "why the ticket is rejected"}.`);
  }
  return withTransaction(async (client) => {
    const ticket = await loadScoped(client, institutionId, ticketId, true);
    if (ticket.version !== update.expected_version) {
      throw new ApiError(409, "version_conflict", "This ticket changed. Load its current state before updating it.");
    }
    if (!TRANSITIONS[ticket.status].includes(update.status)) {
      throw new ApiError(409, "invalid_state", `A ticket that is ${ticket.status.replace("_", " ")} cannot become ${update.status.replace("_", " ")}.`);
    }
    const incident = await findIncidentRow(client, ticket.incident_id, true);
    if (!incident) throw new Error("A ticket lost its incident.");

    const updated = await client.query(
      `UPDATE service_tickets
       SET status = $1, version = version + 1, updated_at = now(),
           result_note = CASE WHEN $1 IN ('resolved', 'rejected') THEN $2 ELSE result_note END,
           expected_resolution_at = CASE WHEN $3 THEN $4::timestamptz ELSE expected_resolution_at END
       WHERE id = $5 AND version = $6`,
      [update.status, note, update.expected_resolution_at !== undefined, update.expected_resolution_at ?? null, ticket.id, ticket.version],
    );
    if (updated.rowCount !== 1) throw new ApiError(409, "version_conflict", "This ticket changed. Load its current state before updating it.");
    await client.query("INSERT INTO service_ticket_events (ticket_id, status, note) VALUES ($1, $2, $3)", [ticket.id, update.status, note]);

    // Acknowledgement is not work started: only the later steps move the incident's progress.
    if (update.status === "in_progress") {
      await client.query("UPDATE incidents SET response_status = 'in_progress' WHERE id = $1", [incident.id]);
    } else if (update.status === "resolved") {
      await client.query("UPDATE incidents SET response_status = 'resolved' WHERE id = $1", [incident.id]);
    } else if (update.status === "rejected") {
      // Back to the official's queue; no other institution is chosen automatically.
      const institution = await client.query<{ name: string }>("SELECT name FROM institutions WHERE id = $1", [institutionId]);
      await client.query(
        `UPDATE incidents SET response_status = 'triaged', responsible_institution_id = NULL, responsibility_rule_id = NULL,
                review_reason = 'ticket_rejected', review_note = $1, review_since = now() WHERE id = $2`,
        [`${institution.rows[0]?.name ?? "The institution"} rejected ticket ${ticket.reference}: ${note}`, incident.id],
      );
    }
    await addIncidentEvent(client, incident.id, PUBLIC_EVENT[update.status]);
    const incidentVersion = await bumpIncidentVersion(client, incident.id);

    await recordAudit(client, ctx, {
      operation: "ticket.update",
      entity_type: "service_ticket",
      entity_id: ticket.id,
      related: { incident_id: incident.id, institution_id: institutionId, status: update.status, ticket_version: ticket.version + 1 },
      outcome: update.status,
      reason: note,
    });
    await enqueueWork(client, {
      kind: "index",
      source: { type: "service_ticket", id: ticket.id, version: ticket.version + 1 },
      idempotency_key: `index:service_ticket:${ticket.id}:v${ticket.version + 1}`,
      correlation_id: ctx.correlation_id,
    });
    await enqueueIncidentIndex(client, { id: incident.id, version: incidentVersion! }, ctx.correlation_id);
    return (await project(client, [await loadScoped(client, institutionId, ticket.id)]))[0];
  });
}

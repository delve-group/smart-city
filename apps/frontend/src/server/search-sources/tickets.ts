import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getPool } from "@/server/db";
import { isUuid } from "@/server/incidents/incidents";
import type { SearchHit, SearchSource } from "./types";
import { searchText, searchTitle } from "./bounds";

interface TicketSourceRow {
  id: string; reference: string; institution_id: string; status: string; version: number; payload: { key: string; value: string }[];
  result_note: string | null; updated_at: Date; category_id: string; issue_type: string; anchor_lat: number; anchor_lng: number; title: string;
}

async function load(ticketId: string): Promise<TicketSourceRow | null> {
  if (!isUuid(ticketId)) return null;
  const result = await getPool().query<TicketSourceRow>(
    `SELECT t.id, t.reference, t.institution_id, t.status, t.version, t.payload, t.result_note, t.updated_at,
            i.category_id, i.issue_type, i.anchor_lat, i.anchor_lng, i.title
     FROM service_tickets t JOIN incidents i ON i.id = t.incident_id WHERE t.id = $1`,
    [ticketId],
  );
  return result.rows[0] ?? null;
}

const text = (row: TicketSourceRow) =>
  [...row.payload.map((line) => `${line.key}: ${line.value}`), `Status: ${row.status}`, row.result_note].filter(Boolean).join("\n");

/** Tickets are never public: officials, the decision-maker and the assigned institution are the only audiences. */
export async function getTicketSearchSource(ticketId: string): Promise<SearchSource | null> {
  const row = await load(ticketId);
  if (!row) return null;
  const title = searchTitle(`${row.reference} · ${row.title}`);
  return {
    record_type: "service_ticket",
    record_id: row.id,
    version: row.version,
    updated_at: row.updated_at.toISOString(),
    category_id: row.category_id,
    issue_type: row.issue_type,
    location: { lat: row.anchor_lat, lng: row.anchor_lng },
    projections: [
      { audience: { kind: "official" }, title, text: searchText(text(row)) },
      { audience: { kind: "institution", institution_id: row.institution_id }, title, text: searchText(text(row)) },
    ],
  };
}

export async function listTicketSourceRefs(cursor: string | null, limit = 200) {
  const result = await getPool().query<{ id: string; version: number }>(
    "SELECT id, version FROM service_tickets WHERE ($1::uuid IS NULL OR id > $1::uuid) ORDER BY id LIMIT $2",
    [cursor, limit],
  );
  return {
    items: result.rows.map((row) => ({ record_type: "service_ticket" as const, record_id: row.id, version: row.version })),
    next_cursor: result.rows.length === limit ? result.rows[result.rows.length - 1].id : null,
  };
}

export async function hydrateTicketHit(ctx: ActorContext, ticketId: string): Promise<SearchHit | null> {
  const operational = (ctx.kind === "system" && ctx.principal === "decision_maker")
    || (ctx.kind === "session" && ctx.actor.role === "official");
  if (!operational && (ctx.kind !== "session" || ctx.actor.role !== "institution")) return null;
  const row = await load(ticketId);
  if (!row) return null;
  const allowed = operational || (ctx.kind === "session" && ctx.actor.role === "institution" && ctx.actor.institution_id === row.institution_id);
  if (!allowed) return null;
  return {
    ref: { record_type: "service_ticket", record_id: row.id },
    version: row.version,
    title: `${row.reference} · ${row.title}`,
    excerpt: text(row).slice(0, 240),
    category_id: row.category_id,
  };
}

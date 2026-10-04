import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import {
  bumpIncidentVersion, findIncidentRow, INCIDENT_COLUMNS, isUuid, refreshSupport, type IncidentRow,
} from "./incidents";
import { publicSummary, timelineText, type TimelineKind } from "./public-templates";
import { enqueueIncidentIndex } from "./work";

type Queryable = Pick<PoolClient, "query">;

/** Allowlisted public projection. Built field by field; nothing private can ride along. */
export interface PublicIncident {
  id: string;
  reference: string;
  category_id: string;
  issue_type: string;
  public_summary: string;
  scope: "building" | "street";
  assessment: IncidentRow["assessment"];
  response_status: IncidentRow["response_status"];
  support_count: number;
  /** Highest severity residents gave in the incident's reports; null when none said. */
  severity: "low" | "medium" | "high" | null;
  accepts_contributions: boolean;
  viewer_support: "reporter" | "contributor" | null;
  public_location: { lat: number; lng: number; label: string; precision: "street" | "building" };
  created_at: string;
  updated_at: string;
  timeline: { id: string; kind: TimelineKind; occurred_at: string; text: string }[];
  provenance: "demo" | "live";
}

export interface IncidentFilters {
  bbox?: { west: number; south: number; east: number; north: number };
  category_ids: string[];
  assessments: string[];
  response_statuses: string[];
  limit: number;
  cursor: string | null;
}

const acceptsContributions = (incident: IncidentRow) => !["resolved", "closed"].includes(incident.response_status);
const viewerId = (ctx: ActorContext) => (ctx.kind === "session" && ctx.actor.role === "resident" ? ctx.actor.id : null);

async function project(client: Queryable, rows: IncidentRow[], ctx: ActorContext): Promise<PublicIncident[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const events = await client.query<{ id: string; incident_id: string; kind: TimelineKind; occurred_at: Date }>(
    "SELECT id, incident_id, kind, occurred_at FROM incident_events WHERE incident_id = ANY($1::uuid[]) ORDER BY occurred_at, id",
    [ids],
  );
  const severities = await client.query<{ incident_id: string; rank: number }>(
    `SELECT incident_id, max(CASE severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END) AS rank
     FROM reports WHERE incident_id = ANY($1::uuid[]) AND severity IS NOT NULL GROUP BY incident_id`,
    [ids],
  );
  const severityOf = new Map(severities.rows.map((row) => [row.incident_id, (["low", "medium", "high"] as const)[row.rank - 1] ?? null]));
  const viewer = viewerId(ctx);
  const support = new Map<string, "reporter" | "contributor">();
  if (viewer) {
    const mine = await client.query<{ incident_id: string; membership: "reporter" | "contributor" }>(
      `SELECT incident_id, 'reporter' AS membership FROM reports WHERE owner_id = $1 AND incident_id = ANY($2::uuid[])
       UNION ALL
       SELECT incident_id, 'contributor' FROM incident_contributions WHERE resident_id = $1 AND incident_id = ANY($2::uuid[])`,
      [viewer, ids],
    );
    // A reporter who also pressed "affected" is still shown as a reporter.
    for (const row of mine.rows) if (support.get(row.incident_id) !== "reporter") support.set(row.incident_id, row.membership);
  }
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    category_id: row.category_id,
    issue_type: row.issue_type,
    public_summary: publicSummary(row.issue_type),
    scope: row.scope,
    assessment: row.assessment,
    response_status: row.response_status,
    support_count: row.support_count,
    severity: severityOf.get(row.id) ?? null,
    accepts_contributions: acceptsContributions(row),
    viewer_support: support.get(row.id) ?? null,
    public_location: { lat: row.anchor_lat, lng: row.anchor_lng, label: row.public_label, precision: row.public_precision },
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    timeline: events.rows
      .filter((event) => event.incident_id === row.id)
      .map((event) => ({ id: event.id, kind: event.kind, occurred_at: event.occurred_at.toISOString(), text: timelineText(event.kind) })),
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

export async function listPublicIncidents(
  ctx: ActorContext,
  filters: IncidentFilters,
): Promise<{ items: PublicIncident[]; next_cursor: string | null }> {
  const cursor = decodeCursor(filters.cursor);
  const pool = getPool();
  const result = await pool.query<IncidentRow & { cursor_updated_at: string }>(
    `SELECT ${INCIDENT_COLUMNS}, to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at
     FROM incidents
     WHERE ($1::double precision IS NULL OR (anchor_lng BETWEEN $1 AND $3 AND anchor_lat BETWEEN $2 AND $4))
       AND (cardinality($5::text[]) = 0 OR category_id = ANY($5))
       AND (cardinality($6::text[]) = 0 OR assessment = ANY($6))
       AND (cardinality($7::text[]) = 0 OR response_status = ANY($7))
       AND ($8::timestamptz IS NULL OR (updated_at, id) < ($8::timestamptz, $9::uuid))
     ORDER BY updated_at DESC, id DESC
     LIMIT $10`,
    [
      filters.bbox?.west ?? null, filters.bbox?.south ?? null, filters.bbox?.east ?? null, filters.bbox?.north ?? null,
      filters.category_ids, filters.assessments, filters.response_statuses,
      cursor?.updated_at ?? null, cursor?.id ?? null, filters.limit + 1,
    ],
  );
  const page = result.rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  return {
    items: await project(pool, page, ctx),
    next_cursor: result.rows.length > filters.limit && last
      ? Buffer.from(`${last.cursor_updated_at}|${last.id}`, "utf8").toString("base64url")
      : null,
  };
}

export async function getPublicIncident(ctx: ActorContext, incidentId: string): Promise<PublicIncident> {
  const row = await findIncidentRow(getPool(), incidentId);
  if (!row) throw new ApiError(404, "not_found", "This incident does not exist.");
  return (await project(getPool(), [row], ctx))[0];
}

export interface ContributionResult {
  incident_id: string;
  membership: "reporter" | "contributor";
  support_count: number;
  assessment: IncidentRow["assessment"];
  created: boolean;
  version: number;
}

/** "I'm affected too": one membership per identity. A repeat, or a reporter, changes nothing. */
export async function addContribution(ctx: ActorContext, incidentId: string): Promise<ContributionResult> {
  if (ctx.kind !== "session" || ctx.actor.role !== "resident") {
    throw new ApiError(403, "forbidden", "Only a resident session can support an incident.");
  }
  const residentId = ctx.actor.id;
  return withTransaction(async (client) => {
    const incident = await findIncidentRow(client, incidentId, true);
    if (!incident) throw new ApiError(404, "not_found", "This incident does not exist.");

    const reporter = await client.query("SELECT 1 FROM reports WHERE incident_id = $1 AND owner_id = $2 LIMIT 1", [incident.id, residentId]);
    const existing = await client.query(
      "SELECT 1 FROM incident_contributions WHERE incident_id = $1 AND resident_id = $2",
      [incident.id, residentId],
    );
    const answer = (membership: "reporter" | "contributor", created: boolean, version: number): ContributionResult => ({
      incident_id: incident.id, membership, support_count: incident.support_count, assessment: incident.assessment, created, version,
    });
    if (reporter.rowCount) return answer("reporter", false, incident.version);
    if (existing.rowCount) return answer("contributor", false, incident.version);

    if (!acceptsContributions(incident)) {
      throw new ApiError(409, "incident_closed", "This incident is finished. Create a new report if the problem is back.");
    }
    await client.query("INSERT INTO incident_contributions (incident_id, resident_id) VALUES ($1, $2)", [incident.id, residentId]);
    await refreshSupport(client, incident);
    const version = await bumpIncidentVersion(client, incident.id);
    await recordAudit(client, ctx, {
      operation: "incident.contribute",
      entity_type: "incident",
      entity_id: incident.id,
      related: { support_count: incident.support_count },
      outcome: "contributor",
    });
    await enqueueIncidentIndex(client, { id: incident.id, version: version! }, ctx.correlation_id);
    return answer("contributor", true, version!);
  });
}

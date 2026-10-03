import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getPool } from "@/server/db";
import { findReportRow, type ReportRow } from "@/server/reports/reports";
import { categoryLabel, findIssueType } from "@/server/reports/issue-types";
import type { SearchHit, SearchSource } from "./types";

function officialText(row: ReportRow): string {
  return [
    row.original_observation,
    row.location_label,
    row.district,
    categoryLabel(row.category_id),
    findIssueType(row.issue_type)?.label,
    `Scope: ${row.scope}`,
  ].filter(Boolean).join("\n");
}

/** Reports are private: officials are the only search audience, whatever the triage state. */
export async function getReportSearchSource(reportId: string): Promise<SearchSource | null> {
  const row = await findReportRow(getPool(), reportId);
  if (!row) return null;
  return {
    record_type: "report",
    record_id: row.id,
    version: row.version,
    updated_at: row.updated_at.toISOString(),
    category_id: row.category_id,
    issue_type: row.issue_type,
    location: { lat: row.lat, lng: row.lng },
    projections: [{ audience: { kind: "official" }, title: `${row.reference} · ${row.summary}`, text: officialText(row) }],
  };
}

export async function listReportSourceRefs(cursor: string | null, limit = 200) {
  const result = await getPool().query<{ id: string; version: number }>(
    "SELECT id, version FROM reports WHERE ($1::uuid IS NULL OR id > $1::uuid) ORDER BY id LIMIT $2",
    [cursor, limit],
  );
  return {
    items: result.rows.map((row) => ({ record_type: "report" as const, record_id: row.id, version: row.version })),
    next_cursor: result.rows.length === limit ? result.rows[result.rows.length - 1].id : null,
  };
}

export async function hydrateReportHit(ctx: ActorContext, reportId: string): Promise<SearchHit | null> {
  if (ctx.kind !== "session" || ctx.actor.role !== "official") return null;
  const row = await findReportRow(getPool(), reportId);
  if (!row) return null;
  return {
    ref: { record_type: "report", record_id: row.id },
    version: row.version,
    title: `${row.reference} · ${row.summary}`,
    excerpt: row.original_observation.slice(0, 240),
    category_id: row.category_id,
  };
}

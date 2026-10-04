import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getPool } from "@/server/db";
import { findIncidentRow } from "@/server/incidents/incidents";
import { publicSummary } from "@/server/incidents/public-templates";
import { categoryLabel, findIssueType } from "@/server/reports/issue-types";
import type { SearchHit, SearchSource } from "./types";
import { searchText, searchTitle } from "./bounds";

async function officialText(incidentId: string): Promise<string> {
  const reports = await getPool().query<{ reference: string; summary: string }>(
    "SELECT reference, summary FROM reports WHERE incident_id = $1 ORDER BY submitted_at DESC, id DESC LIMIT 32",
    [incidentId],
  );
  const evidence = await getPool().query<{ label: string }>(
    "SELECT label FROM incident_evidence WHERE incident_id = $1 AND removed_at IS NULL AND kind = 'observation' ORDER BY retrieved_at DESC, id DESC LIMIT 32",
    [incidentId],
  );
  return [
    ...reports.rows.map((row) => `${row.reference}: ${row.summary}`),
    ...evidence.rows.map((row) => row.label),
  ].join("\n");
}

/** Public text is the controlled summary and location label only; report text is official-only. */
export async function getIncidentSearchSource(incidentId: string): Promise<SearchSource | null> {
  const row = await findIncidentRow(getPool(), incidentId);
  if (!row) return null;
  const summary = `${publicSummary(row.issue_type)}\n${row.public_label}`;
  const classification = [categoryLabel(row.category_id), findIssueType(row.issue_type)?.label].filter(Boolean).join(", ");
  return {
    record_type: "incident",
    record_id: row.id,
    version: row.version,
    updated_at: row.updated_at.toISOString(),
    category_id: row.category_id,
    issue_type: row.issue_type,
    location: { lat: row.anchor_lat, lng: row.anchor_lng },
    projections: [
      { audience: { kind: "public" }, title: searchTitle(`${row.reference} · ${row.title}`), text: `${summary}\n${classification}` },
      {
        audience: { kind: "official" },
        title: searchTitle(`${row.reference} · ${row.title}`),
        text: searchText([summary, classification, row.district, await officialText(row.id)].filter(Boolean).join("\n")),
      },
    ],
  };
}

export async function listIncidentSourceRefs(cursor: string | null, limit = 200) {
  const result = await getPool().query<{ id: string; version: number }>(
    "SELECT id, version FROM incidents WHERE ($1::uuid IS NULL OR id > $1::uuid) ORDER BY id LIMIT $2",
    [cursor, limit],
  );
  return {
    items: result.rows.map((row) => ({ record_type: "incident" as const, record_id: row.id, version: row.version })),
    next_cursor: result.rows.length === limit ? result.rows[result.rows.length - 1].id : null,
  };
}

/** Officials get the case title; everyone else, including institutions, the public projection. */
export async function hydrateIncidentHit(ctx: ActorContext, incidentId: string): Promise<SearchHit | null> {
  const row = await findIncidentRow(getPool(), incidentId);
  if (!row) return null;
  return {
    ref: { record_type: "incident", record_id: row.id },
    version: row.version,
    title: searchTitle(`${row.reference} · ${row.title}`),
    excerpt: publicSummary(row.issue_type),
    category_id: row.category_id,
  };
}

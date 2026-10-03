import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import type { Report, ReportScope, TriageState } from "./contracts";

export interface ReportRow {
  id: string;
  reference: string;
  owner_id: string;
  channel: "form" | "voice";
  category_id: string;
  issue_type: string;
  summary: string;
  original_observation: string;
  severity: "low" | "medium" | "high" | null;
  lat: number;
  lng: number;
  location_label: string;
  street: string | null;
  building_number: string | null;
  unit: string | null;
  district: string | null;
  location_precision: "building" | "street" | "point";
  location_source: "geocoder" | "map_pin" | "device";
  location_candidate_id: string | null;
  observed_at: Date | null;
  observed_time_state: "known" | "unknown";
  scope: ReportScope;
  urgent: boolean;
  triage_state: TriageState;
  incident_id: string | null;
  resident_next_step: string | null;
  version: number;
  submitted_at: Date;
  updated_at: Date;
}

export const REPORT_COLUMNS = `id, reference, owner_id, channel, category_id, issue_type, summary, original_observation,
  severity, lat, lng, location_label, street, building_number, unit, district, location_precision, location_source,
  location_candidate_id, observed_at, observed_time_state, scope, urgent, triage_state, incident_id, resident_next_step,
  version, submitted_at, updated_at`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Explicit private projection: the owner's identity and the submission key never leave the server. */
export function projectReport(row: ReportRow): Report {
  return {
    id: row.id,
    reference: row.reference,
    channel: row.channel,
    category_id: row.category_id,
    issue_type: row.issue_type,
    summary: row.summary,
    original_observation: row.original_observation,
    severity: row.severity,
    location: {
      candidate_id: row.location_candidate_id,
      lat: row.lat,
      lng: row.lng,
      label: row.location_label,
      street: row.street,
      building_number: row.building_number,
      district: row.district,
      precision: row.location_precision,
      source: row.location_source,
      unit: row.unit,
    },
    observed_at: row.observed_at ? row.observed_at.toISOString() : null,
    observed_time_state: row.observed_time_state,
    submitted_at: row.submitted_at.toISOString(),
    scope: row.scope,
    urgent: row.urgent,
    triage_state: row.triage_state,
    incident_id: row.incident_id,
    resident_next_step: row.resident_next_step,
    version: row.version,
    provenance: "demo",
  };
}

export async function findReportRow(client: Pick<PoolClient, "query">, reportId: string): Promise<ReportRow | null> {
  if (!UUID.test(reportId)) return null;
  const result = await client.query<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = $1`, [reportId]);
  return result.rows[0] ?? null;
}

/** Owner or official only. Anyone else gets the same answer as for a missing report. */
export async function getReport(ctx: ActorContext, reportId: string): Promise<Report> {
  const row = await findReportRow(getPool(), reportId);
  const allowed = row && ctx.kind === "session"
    && (ctx.actor.role === "official" || (ctx.actor.role === "resident" && ctx.actor.id === row.owner_id));
  if (!row || !allowed) throw new ApiError(404, "not_found", "This report does not exist or is not available to you.");
  return projectReport(row);
}

import "server-only";

import type { PoolClient } from "pg";
import { afterIncidentChange } from "@/server/actions/proposal-lifecycle";
import type { IncidentContent } from "@/shared/incidents/content";
import type { TimelineKind } from "./public-templates";

type Queryable = Pick<PoolClient, "query">;

export interface IncidentRow {
  id: string;
  reference: string;
  category_id: string;
  issue_type: string;
  title: string;
  description: string;
  public_content: IncidentContent | null;
  anchor_lat: number;
  anchor_lng: number;
  anchor_observed_at: Date | null;
  service_area_id: string;
  street_key: string | null;
  building_key: string | null;
  scope: "building" | "street";
  public_label: string;
  public_precision: "street" | "building";
  district: string | null;
  assessment: "suspected" | "corroborated" | "verified" | "disputed";
  response_status: "new" | "triaged" | "assigned" | "in_progress" | "resolved" | "closed";
  support_count: number;
  urgent: boolean;
  responsible_institution_id: string | null;
  responsibility_rule_id: string | null;
  review_reason: string | null;
  review_note: string | null;
  review_since: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export const INCIDENT_COLUMNS = `id, reference, category_id, issue_type, title, description, public_content, anchor_lat, anchor_lng, anchor_observed_at,
  service_area_id, street_key, building_key, scope, public_label, public_precision, district, assessment,
  response_status, support_count, urgent, responsible_institution_id, responsibility_rule_id, review_reason,
  review_note, review_since, version, created_at, updated_at`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export async function findIncidentRow(client: Queryable, incidentId: string, lock = false): Promise<IncidentRow | null> {
  if (!isUuid(incidentId)) return null;
  const result = await client.query<IncidentRow>(
    `SELECT ${INCIDENT_COLUMNS} FROM incidents WHERE id = $1${lock ? " FOR UPDATE" : ""}`,
    [incidentId],
  );
  return result.rows[0] ?? null;
}

export async function addIncidentEvent(client: Queryable, incidentId: string, kind: TimelineKind): Promise<void> {
  await client.query("INSERT INTO incident_events (incident_id, kind) VALUES ($1, $2)", [incidentId, kind]);
}

/** Distinct identities behind an incident: owners of linked reports plus explicit contributions. */
export async function countSupport(client: Queryable, incidentId: string): Promise<number> {
  const result = await client.query<{ support: string }>(
    `SELECT count(*) AS support FROM (
       SELECT owner_id AS identity FROM reports WHERE incident_id = $1
       UNION
       SELECT resident_id FROM incident_contributions WHERE incident_id = $1
     ) supporters`,
    [incidentId],
  );
  return Number(result.rows[0].support);
}

/**
 * Recomputes support for a locked incident. Support may move the assessment only between
 * suspected and corroborated; an official's verified or disputed decision is never overwritten.
 * Returns true when the incident materially changed (and so needs a new version).
 */
export async function refreshSupport(client: Queryable, incident: IncidentRow): Promise<boolean> {
  const support = await countSupport(client, incident.id);
  if (support === incident.support_count) return false;

  let assessment = incident.assessment;
  if (assessment === "suspected" && support >= 2) assessment = "corroborated";
  else if (assessment === "corroborated" && support < 2) assessment = "suspected";

  await client.query("UPDATE incidents SET support_count = $1, assessment = $2 WHERE id = $3", [support, assessment, incident.id]);
  if (assessment === "corroborated" && incident.assessment !== "corroborated") {
    await addIncidentEvent(client, incident.id, "corroborated");
  }
  incident.support_count = support;
  incident.assessment = assessment;
  return true;
}

/**
 * One material change = one new version. With `expectedVersion` this is the atomic
 * expected-version write: null means the caller's view was stale and nothing was changed.
 * Unexecuted proposals are superseded in the same transaction.
 */
export async function bumpIncidentVersion(
  client: PoolClient,
  incidentId: string,
  expectedVersion?: number,
  options: { propose: boolean } = { propose: true },
): Promise<number | null> {
  const result = await client.query<{ version: number }>(
    `UPDATE incidents SET version = version + 1, updated_at = now()
     WHERE id = $1 AND ($2::integer IS NULL OR version = $2) RETURNING version`,
    [incidentId, expectedVersion ?? null],
  );
  const version = result.rows[0]?.version ?? null;
  if (version !== null) await afterIncidentChange(client, incidentId, options);
  return version;
}

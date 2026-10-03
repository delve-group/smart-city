import "server-only";

import type { PoolClient } from "pg";
import { getPool } from "@/server/db";
import { serviceAreaId, type LatLng } from "./geo";

export interface ResponsibilityMatch {
  rule_id: string;
  ruleset_version: number;
  institution: { id: string; name: string; is_demo: boolean };
  reason: string;
}

export interface ResponsibilityResult {
  service_area_id: string;
  /** Exactly one match is usable; zero or several need an official's decision. */
  matches: ResponsibilityMatch[];
  outcome: "single" | "none" | "multiple";
}

/**
 * Configured demo mapping only: category/issue and service area. Never the geocoder,
 * a company named by a resident or a model's guess.
 */
export async function resolveResponsibility(
  input: { category_id: string; issue_type: string; location: LatLng },
  client: Pick<PoolClient, "query"> = getPool(),
): Promise<ResponsibilityResult> {
  const area = serviceAreaId(input.location);
  const result = await client.query<{
    id: string; ruleset_version: number; issue_type: string | null; service_area_id: string | null;
    institution_id: string; name: string; is_demo: boolean;
  }>(
    `SELECT r.id, r.ruleset_version, r.issue_type, r.service_area_id, i.id AS institution_id, i.name, i.is_demo
     FROM responsibility_rules r JOIN institutions i ON i.id = r.institution_id
     WHERE r.category_id = $1 AND (r.issue_type IS NULL OR r.issue_type = $2)
       AND (r.service_area_id IS NULL OR r.service_area_id = $3)
     ORDER BY r.id`,
    [input.category_id, input.issue_type, area],
  );
  const byInstitution = new Map<string, ResponsibilityMatch>();
  for (const row of result.rows) {
    if (byInstitution.has(row.institution_id)) continue;
    byInstitution.set(row.institution_id, {
      rule_id: row.id,
      ruleset_version: row.ruleset_version,
      institution: { id: row.institution_id, name: row.name, is_demo: row.is_demo },
      reason: `Demo rule ${row.id}: ${input.category_id}/${row.issue_type ?? "any issue"} in ${row.service_area_id ?? "any area"}.`,
    });
  }
  const matches = [...byInstitution.values()];
  return { service_area_id: area, matches, outcome: matches.length === 1 ? "single" : matches.length ? "multiple" : "none" };
}

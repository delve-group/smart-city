import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import type { Report } from "@/server/reports/contracts";
import { projectReport, REPORT_COLUMNS, type ReportRow } from "@/server/reports/reports";
import { findIncidentRow, type IncidentRow } from "./incidents";
import { getServiceObservations, type ServiceObservation } from "./observations";
import { resolveResponsibility, type ResponsibilityResult } from "./responsibility";

export interface EvidenceItem {
  id: string;
  kind: "report" | "observation";
  report_id: string | null;
  label: string;
  source: string;
  observed_at: string | null;
  retrieved_at: string;
  provenance: "demo" | "live";
  state: "current" | "stale" | "missing" | "contradictory";
  note: string | null;
}

export interface IncidentContext {
  incident: {
    id: string; reference: string; category_id: string; issue_type: string; title: string; scope: "building" | "street";
    anchor: { lat: number; lng: number; observed_at: string | null }; public_label: string; district: string | null;
    service_area_id: string; assessment: IncidentRow["assessment"]; response_status: IncidentRow["response_status"];
    support_count: number; urgent: boolean; responsible_institution_id: string | null; version: number; updated_at: string;
  };
  reports: Report[];
  evidence: EvidenceItem[];
  /** Read now from the demo fixture; availability and freshness are explicit. */
  observations: ServiceObservation[];
  responsibility: ResponsibilityResult;
}

export async function listEvidence(incidentId: string): Promise<EvidenceItem[]> {
  const result = await getPool().query<Omit<EvidenceItem, "observed_at" | "retrieved_at"> & { observed_at: Date | null; retrieved_at: Date }>(
    `SELECT id, kind, report_id, label, source, observed_at, retrieved_at, provenance, state, note
     FROM incident_evidence WHERE incident_id = $1 AND removed_at IS NULL ORDER BY retrieved_at, id`,
    [incidentId],
  );
  return result.rows.map((row) => ({
    ...row,
    observed_at: row.observed_at ? row.observed_at.toISOString() : null,
    retrieved_at: row.retrieved_at.toISOString(),
  }));
}

/** Private case file for an official or the bounded decision-maker. Never for residents or institutions. */
export async function getIncidentContext(ctx: ActorContext, incidentId: string): Promise<IncidentContext> {
  const allowed = (ctx.kind === "session" && ctx.actor.role === "official")
    || (ctx.kind === "system" && ctx.principal === "decision_maker");
  if (!allowed) throw new ApiError(403, "forbidden", "This account cannot read private incident details.");

  const row = await findIncidentRow(getPool(), incidentId);
  if (!row) throw new ApiError(404, "not_found", "This incident does not exist.");
  const reports = await getPool().query<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM reports WHERE incident_id = $1 ORDER BY submitted_at`,
    [row.id],
  );
  return {
    incident: {
      id: row.id, reference: row.reference, category_id: row.category_id, issue_type: row.issue_type, title: row.title,
      scope: row.scope,
      anchor: { lat: row.anchor_lat, lng: row.anchor_lng, observed_at: row.anchor_observed_at?.toISOString() ?? null },
      public_label: row.public_label, district: row.district, service_area_id: row.service_area_id,
      assessment: row.assessment, response_status: row.response_status, support_count: row.support_count,
      urgent: row.urgent, responsible_institution_id: row.responsible_institution_id, version: row.version,
      updated_at: row.updated_at.toISOString(),
    },
    reports: reports.rows.map(projectReport),
    evidence: await listEvidence(row.id),
    observations: getServiceObservations(row),
    responsibility: await resolveResponsibility({
      category_id: row.category_id, issue_type: row.issue_type, location: { lat: row.anchor_lat, lng: row.anchor_lng },
    }),
  };
}

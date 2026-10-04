import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { classifyReport, type ReportClassification } from "@/server/agents/report-classification";
import { getPool, withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { findReportRow, REPORT_COLUMNS, type ReportRow } from "@/server/reports/reports";
import { enqueueReportWork } from "@/server/reports/work";
import { buildingKey, serviceAreaId, streetKey } from "./geo";
import {
  addIncidentEvent, bumpIncidentVersion, findIncidentRow, INCIDENT_COLUMNS, isUuid, refreshSupport, type IncidentRow,
} from "./incidents";
import { getServiceObservations } from "./observations";
import { incidentContentSchema, type IncidentContent } from "@/shared/incidents/content";
import { resolveResponsibility } from "./responsibility";
import { decideTriage, TRIAGE_POLICY, type TriageDecision } from "./triage-policy";
import { enqueueIncidentIndex } from "./work";

export type TriageOutcome =
  | { status: "linked"; incident_id: string; created_incident: boolean; report_version: number }
  | { status: "needs_review"; reason: string; report_version: number }
  | { status: "superseded"; detail: string };

function actorLabel(ctx: ActorContext): string {
  return ctx.kind === "system" ? ctx.principal : ctx.kind === "session" ? ctx.actor.role : "anonymous";
}

/** Attaches a report to a locked incident: link history, report evidence, support and one new version. */
export async function linkReportToIncident(
  client: PoolClient,
  ctx: ActorContext,
  report: ReportRow,
  incident: IncidentRow,
  reason: string,
): Promise<number> {
  await client.query(
    "INSERT INTO incident_report_links (report_id, incident_id, linked_by, reason) VALUES ($1, $2, $3, $4)",
    [report.id, incident.id, actorLabel(ctx), reason],
  );
  await client.query(
    `INSERT INTO incident_evidence (incident_id, report_id, kind, label, source, observed_at, provenance, state)
     VALUES ($1, $2, 'report', $3, 'Resident report (unverified identity)', $4, 'demo', 'current')`,
    [incident.id, report.id, `${report.reference} · ${report.channel === "voice" ? "Voice" : "Form"} report`, report.observed_at],
  );
  await refreshSupport(client, incident);
  // A new linked report is a material change even when its owner was already counted.
  const version = await bumpIncidentVersion(client, incident.id);
  await enqueueIncidentIndex(client, { id: incident.id, version: version! }, ctx.correlation_id);
  return version!;
}

/** Opens a suspected incident anchored at the report. The anchor never moves afterwards. */
export async function createIncidentFromReport(client: PoolClient, ctx: ActorContext, report: ReportRow, content?: IncidentContent | null): Promise<IncidentRow> {
  if (content === undefined) {
    const saved = await client.query<{ content: unknown }>(
      "SELECT triage_policy->'classification'->'public_content' AS content FROM reports WHERE id = $1", [report.id],
    );
    const parsed = incidentContentSchema.safeParse(saved.rows[0]?.content);
    content = parsed.success ? parsed.data : null;
  }
  const scope = report.scope === "building" ? "building" : "street";
  // Geocoders return "Józefa Dietla" as often as "ul. Józefa Dietla" or "aleja Pokoju".
  const street = !report.street
    ? report.location_label
    : /^(ulica|ul\.|aleja|aleje|al\.|osiedle|os\.|plac|pl\.|rondo|bulwar)\s/i.test(report.street)
      ? report.street
      : `ul. ${report.street}`;
  const publicLabel = scope === "building" && report.street && report.building_number ? `${street} ${report.building_number}` : street;
  const location = { lat: report.lat, lng: report.lng };
  const responsibility = await resolveResponsibility(
    { category_id: report.category_id, issue_type: report.issue_type, location },
    client,
  );
  const single = responsibility.outcome === "single" ? responsibility.matches[0] : null;
  const review = single
    ? null
    : responsibility.outcome === "multiple"
      ? "Several institutions match. Choose who should respond."
      : "No configured institution covers this. Choose who should respond or keep it in review.";

  const inserted = await client.query<IncidentRow>(
    `INSERT INTO incidents
       (reference, category_id, issue_type, title, anchor_lat, anchor_lng, anchor_observed_at, service_area_id, street_key,
        building_key, scope, public_label, public_precision, district, urgent, response_status,
        responsible_institution_id, responsibility_rule_id, review_reason, review_note, review_since, description, public_content)
     VALUES ('INC-26-' || lpad(nextval('incident_reference_seq')::text, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17, $18, $19, CASE WHEN $18::text IS NULL THEN NULL ELSE now() END, $20, $21::jsonb)
     RETURNING ${INCIDENT_COLUMNS}`,
    [
      report.category_id, report.issue_type, report.summary, report.lat, report.lng,
      report.observed_at, responsibility.service_area_id, streetKey(report.street),
      buildingKey(report.street, report.building_number), scope, publicLabel, scope, report.district, report.urgent,
      single ? "triaged" : "new", single?.institution.id ?? null, single?.rule_id ?? null,
      review ? "needs_responsibility" : null, review, report.original_observation, content ? JSON.stringify(content) : null,
    ],
  );
  const incident = inserted.rows[0];
  await addIncidentEvent(client, incident.id, "reported");

  for (const observation of getServiceObservations(incident)) {
    await client.query(
      `INSERT INTO incident_evidence (incident_id, kind, label, source, observed_at, provenance, state, note)
       VALUES ($1, 'observation', $2, $3, $4, 'demo', $5, $6)`,
      [incident.id, observation.label, observation.source, observation.observed_at, observation.state, observation.note],
    );
  }
  await recordAudit(client, ctx, {
    operation: "incident.create",
    entity_type: "incident",
    entity_id: incident.id,
    related: {
      report_id: report.id,
      responsibility: responsibility.outcome,
      responsibility_rule_id: single?.rule_id ?? null,
      ruleset_version: single?.ruleset_version ?? null,
    },
    outcome: incident.response_status,
  });
  return incident;
}

/** Marks a locked report linked, as an expected-version write. False: the report changed meanwhile. */
export async function markReportLinked(client: PoolClient, report: ReportRow, incidentId: string, policy: object): Promise<boolean> {
  const updated = await client.query(
    `UPDATE reports
     SET triage_state = 'linked', incident_id = $1, review_reason = NULL, review_note = NULL, review_since = NULL,
         review_candidates = '[]'::jsonb, triage_policy = $2, resident_next_step = NULL, version = version + 1, updated_at = now()
     WHERE id = $3 AND version = $4`,
    [incidentId, JSON.stringify(policy), report.id, report.version],
  );
  return updated.rowCount === 1;
}

async function loadCandidates(client: PoolClient, report: ReportRow) {
  const result = await client.query<IncidentRow>(
    `SELECT ${INCIDENT_COLUMNS} FROM incidents
     WHERE category_id = $1 AND issue_type = $2 AND response_status IN ('new', 'triaged', 'assigned', 'in_progress')`,
    [report.category_id, report.issue_type],
  );
  return result.rows;
}

/**
 * Automatic triage of one report at one version. AI classifies before deterministic triage; a caller's
 * suggestion is recorded but can never widen eligibility. The search-and-create decision is
 * serialised per category/issue, and candidates are re-read from the primary store inside the
 * transaction, so two simultaneous reports cannot both open an incident.
 */
export async function triageReport(
  ctx: ActorContext,
  input: { report_id: string; expected_version: number; suggestion?: { incident_id?: string; rationale?: string } },
): Promise<TriageOutcome> {
  if (ctx.kind !== "system" || (ctx.principal !== "triage" && ctx.principal !== "decision_maker")) {
    throw new ApiError(403, "forbidden", "Automatic triage runs only as a server-side principal.");
  }
  if (!isUuid(input.report_id)) throw new ApiError(404, "not_found", "This report does not exist.");

  const preview = await findReportRow(getPool(), input.report_id);
  if (!preview) throw new ApiError(404, "not_found", "This report does not exist.");
  if (preview.version !== input.expected_version || preview.triage_state !== "pending") {
    return { status: "superseded", detail: "The report changed or has already been triaged." };
  }
  const officialClassification = await getPool().query(
    `SELECT 1 FROM audit_events WHERE entity_type = 'report' AND entity_id = $1
       AND operation = 'report.classify' AND actor_role = 'official' LIMIT 1`,
    [preview.id],
  );
  const classification: ReportClassification = officialClassification.rowCount
    ? { outcome: "official" }
    : await classifyReport(preview);
  const classifiedCategory = classification.outcome === "classified" ? classification.category_id! : preview.category_id;
  const classifiedIssue = classification.outcome === "classified" ? classification.issue_type! : preview.issue_type;

  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`triage:${classifiedCategory}:${classifiedIssue}`]);

    const current = await client.query<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = $1 FOR UPDATE`, [input.report_id]);
    const report = current.rows[0];
    // A decision computed for an older version must not touch a newer one, e.g. after a human change.
    if (report.version !== input.expected_version) return { status: "superseded", detail: "The report changed; this triage was discarded." };
    if (report.triage_state !== "pending") return { status: "superseded", detail: `The report is already ${report.triage_state}.` };

    if (classification.outcome === "classified") {
      await client.query("UPDATE reports SET category_id = $2, issue_type = $3 WHERE id = $1", [report.id, classifiedCategory, classifiedIssue]);
      report.category_id = classifiedCategory;
      report.issue_type = classifiedIssue;
    }

    const candidates = await loadCandidates(client, report);
    const deterministicDecision = decideTriage(
      {
        category_id: report.category_id,
        issue_type: report.issue_type,
        location: { lat: report.lat, lng: report.lng },
        street: report.street,
        building_number: report.building_number,
        observed_at: report.observed_at,
        scope: report.scope,
        urgent: report.urgent,
      },
      candidates.map((incident) => ({
        id: incident.id,
        category_id: incident.category_id,
        issue_type: incident.issue_type,
        anchor: { lat: incident.anchor_lat, lng: incident.anchor_lng },
        anchor_observed_at: incident.anchor_observed_at,
        service_area_id: incident.service_area_id,
        street_key: incident.street_key,
        building_key: incident.building_key,
        response_status: incident.response_status,
        assessment: incident.assessment,
      })),
    );
    // Immediate danger and private scope keep precedence over any model outcome.
    const decision: TriageDecision = (classification.outcome === "review" || classification.outcome === "unavailable")
      && !report.urgent && report.scope !== "unit"
      ? { outcome: "review", reason: "needs_link", note: classification.explanation,
          candidates: deterministicDecision.outcome === "review" ? deterministicDecision.candidates : [] }
      : deterministicDecision;
    const policy = {
      policy_version: TRIAGE_POLICY.version,
      radius_m: TRIAGE_POLICY.radius_m,
      window_minutes: TRIAGE_POLICY.window_minutes,
      service_area_id: serviceAreaId({ lat: report.lat, lng: report.lng }),
      outcome: decision.outcome,
      note: decision.note,
      suggested_incident_id: input.suggestion?.incident_id ?? null,
      classification: { ...classification, submitted_category_id: preview.category_id, submitted_issue_type: preview.issue_type },
    };

    if (decision.outcome === "review") {
      await client.query(
        `UPDATE reports
         SET triage_state = 'needs_review', review_reason = $1, review_note = $2, review_since = now(),
             review_candidates = $3, triage_policy = $4, version = version + 1, updated_at = now()
         WHERE id = $5 AND version = $6`,
        [decision.reason, decision.note, JSON.stringify(decision.candidates), JSON.stringify(policy), report.id, report.version],
      );
      await recordAudit(client, ctx, {
        operation: "report.triage",
        entity_type: "report",
        entity_id: report.id,
        related: { policy_version: TRIAGE_POLICY.version, candidates: decision.candidates.length },
        outcome: "needs_review",
        reason: decision.note,
      });
      await enqueueReportWork(client, { id: report.id, version: report.version + 1 }, ctx.correlation_id, { triage: false });
      return { status: "needs_review", reason: decision.reason, report_version: report.version + 1 };
    }

    const created = decision.outcome === "new_incident";
    const incident = created
      ? await createIncidentFromReport(client, ctx, report, "public_content" in classification ? classification.public_content : null)
      : await findIncidentRow(client, decision.incident_id, true);
    if (!incident) throw new Error("A triage candidate disappeared inside its transaction.");

    if (!(await markReportLinked(client, report, incident.id, policy))) {
      throw new ApiError(409, "version_conflict", "The report changed during triage.");
    }
    await linkReportToIncident(client, ctx, { ...report, incident_id: incident.id }, incident, decision.note);
    await recordAudit(client, ctx, {
      operation: "report.triage",
      entity_type: "report",
      entity_id: report.id,
      related: { incident_id: incident.id, created_incident: created, policy_version: TRIAGE_POLICY.version },
      outcome: "linked",
      reason: decision.note,
    });
    await enqueueReportWork(client, { id: report.id, version: report.version + 1 }, ctx.correlation_id, { triage: false });
    return { status: "linked", incident_id: incident.id, created_incident: created, report_version: report.version + 1 };
  });
}

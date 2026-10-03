import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";
import { assertCanPropose } from "@/server/actions/proposals";
import { insertProposal } from "@/server/actions/proposal-lifecycle";
import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { findIssueType, isKnownCategory, issueTypeFitsCategory } from "@/server/reports/issue-types";
import { REPORT_COLUMNS, type ReportRow } from "@/server/reports/reports";
import { enqueueReportWork } from "@/server/reports/work";
import {
  addIncidentEvent, bumpIncidentVersion, findIncidentRow, isUuid, refreshSupport, type IncidentRow,
} from "./incidents";
import { createIncidentFromReport, linkReportToIncident, markReportLinked } from "./triage";
import { ACTIVE_RESPONSE_STATUSES } from "./triage-policy";
import { enqueueIncidentIndex } from "./work";

/*
 * Human authority. Every command here needs an official session and the version the official
 * was looking at; a stale version changes nothing. No agent tool or executor path reaches these.
 */

export type ReportTriageCommand =
  | { decision: "link"; expected_version: number; incident_id: string; expected_incident_version: number; reason?: string }
  | { decision: "new_incident"; expected_version: number; reason?: string }
  | { decision: "private_issue" | "out_of_scope"; expected_version: number; reason: string };

export type IncidentCommand =
  | { type: "choose_institution"; expected_version: number; institution_id: string }
  | { type: "verify"; expected_version: number; evidence_ids: string[]; reason: string }
  | { type: "dispute"; expected_version: number; reason: string; evidence_ids?: string[] }
  | { type: "close"; expected_version: number }
  | { type: "reopen"; expected_version: number; reason: string };

function requireOfficial(ctx: ActorContext) {
  if (ctx.kind !== "session" || ctx.actor.role !== "official") {
    throw new ApiError(403, "forbidden", "Only an official can make this decision.");
  }
}

const conflict = () => new ApiError(409, "version_conflict", "Someone changed this while you were reviewing it. Check the latest version.");
const isActive = (incident: IncidentRow) => (ACTIVE_RESPONSE_STATUSES as readonly string[]).includes(incident.response_status);

async function lockReport(client: PoolClient, reportId: string, expectedVersion: number): Promise<ReportRow> {
  if (!isUuid(reportId)) throw new ApiError(404, "not_found", "This report does not exist.");
  const result = await client.query<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = $1 FOR UPDATE`, [reportId]);
  const report = result.rows[0];
  if (!report) throw new ApiError(404, "not_found", "This report does not exist.");
  if (report.version !== expectedVersion) throw conflict();
  return report;
}

/** Detaches a report from its current incident, keeping the link and its reason in history. */
async function unlinkReport(client: PoolClient, ctx: ActorContext, report: ReportRow, reason: string): Promise<void> {
  if (!report.incident_id) return;
  const previous = await findIncidentRow(client, report.incident_id, true);
  if (!previous) return;
  await client.query(
    "UPDATE incident_report_links SET unlinked_at = now(), unlink_reason = $1 WHERE report_id = $2 AND unlinked_at IS NULL",
    [reason, report.id],
  );
  await client.query(
    "UPDATE incident_evidence SET removed_at = now() WHERE incident_id = $1 AND report_id = $2 AND removed_at IS NULL",
    [previous.id, report.id],
  );
  await client.query("UPDATE reports SET incident_id = NULL WHERE id = $1", [report.id]);
  await refreshSupport(client, previous);
  const version = await bumpIncidentVersion(client, previous.id);
  await recordAudit(client, ctx, {
    operation: "incident.unlink_report",
    entity_type: "incident",
    entity_id: previous.id,
    related: { incident_id: previous.id, report_id: report.id },
    outcome: "unlinked",
    reason,
  });
  await enqueueIncidentIndex(client, { id: previous.id, version: version! }, ctx.correlation_id);
}

/** Manual triage of a report: link or correct its link, open an incident, or keep it private / out of scope. */
export async function decideReportTriage(ctx: ActorContext, reportId: string, command: ReportTriageCommand): Promise<void> {
  requireOfficial(ctx);
  await withTransaction(async (client) => {
    const report = await lockReport(client, reportId, command.expected_version);
    const relinking = Boolean(report.incident_id);
    const reason = command.reason?.trim() ?? "";
    if (relinking && !reason) {
      throw new ApiError(400, "invalid_request", "reason: say why the existing link is being changed.");
    }

    if (command.decision === "link") {
      if (report.incident_id === command.incident_id) throw new ApiError(409, "invalid_state", "This report is already linked to that incident.");
      const target = await findIncidentRow(client, command.incident_id, true);
      if (!target) throw new ApiError(404, "not_found", "This incident does not exist.");
      if (target.version !== command.expected_incident_version) throw conflict();
      if (!isActive(target)) throw new ApiError(409, "invalid_state", "This incident is finished. Start a new incident instead.");
      await unlinkReport(client, ctx, report, reason);
      if (!(await markReportLinked(client, report, target.id, { outcome: "manual_link", by: "official" }))) throw conflict();
      await linkReportToIncident(client, ctx, { ...report, incident_id: target.id }, target, reason || "Manual link by an official");
    } else if (command.decision === "new_incident") {
      await unlinkReport(client, ctx, report, reason);
      const incident = await createIncidentFromReport(client, ctx, report);
      if (!(await markReportLinked(client, report, incident.id, { outcome: "manual_new_incident", by: "official" }))) throw conflict();
      await linkReportToIncident(client, ctx, { ...report, incident_id: incident.id }, incident, reason || "New incident from a manual review");
    } else {
      await unlinkReport(client, ctx, report, reason);
      const updated = await client.query(
        `UPDATE reports
         SET triage_state = $1, incident_id = NULL, resident_next_step = $2, review_reason = NULL, review_note = NULL,
             review_since = NULL, review_candidates = '[]'::jsonb, version = version + 1, updated_at = now()
         WHERE id = $3 AND version = $4`,
        [command.decision, reason, report.id, report.version],
      );
      if (updated.rowCount !== 1) throw conflict();
    }

    await recordAudit(client, ctx, {
      operation: `report.${command.decision}`,
      entity_type: "report",
      entity_id: report.id,
      related: {
        incident_id: command.decision === "link" ? command.incident_id : null,
        previous_incident_id: report.incident_id,
        relinked: relinking,
      },
      outcome: command.decision === "link" || command.decision === "new_incident" ? "linked" : command.decision,
      reason: reason || null,
    });
    await enqueueReportWork(client, { id: report.id, version: report.version + 1 }, ctx.correlation_id, { triage: false });
  });
}

/** Corrects a report's classification. The original observation is never edited. */
export async function classifyReport(
  ctx: ActorContext,
  reportId: string,
  command: { expected_version: number; category_id?: string; issue_type?: string; scope?: ReportRow["scope"]; reason: string },
): Promise<void> {
  requireOfficial(ctx);
  await withTransaction(async (client) => {
    const report = await lockReport(client, reportId, command.expected_version);
    const categoryId = command.category_id ?? report.category_id;
    const issueType = command.issue_type ?? report.issue_type;
    if (!isKnownCategory(categoryId)) throw new ApiError(400, "invalid_request", "category_id: unknown category.");
    if (!findIssueType(issueType) || !issueTypeFitsCategory(issueType, categoryId)) {
      throw new ApiError(400, "invalid_request", "issue_type: does not belong to this category.");
    }
    const retriage = !report.incident_id;
    const updated = await client.query(
      `UPDATE reports
       SET category_id = $1, issue_type = $2, scope = $3, version = version + 1, updated_at = now(),
           triage_state = CASE WHEN $4 THEN 'pending' ELSE triage_state END,
           review_reason = CASE WHEN $4 THEN NULL ELSE review_reason END,
           review_note = CASE WHEN $4 THEN NULL ELSE review_note END,
           review_since = CASE WHEN $4 THEN NULL ELSE review_since END,
           review_candidates = CASE WHEN $4 THEN '[]'::jsonb ELSE review_candidates END,
           resident_next_step = CASE WHEN $4 THEN NULL ELSE resident_next_step END
       WHERE id = $5 AND version = $6`,
      [categoryId, issueType, command.scope ?? report.scope, retriage, report.id, report.version],
    );
    if (updated.rowCount !== 1) throw conflict();
    await recordAudit(client, ctx, {
      operation: "report.classify",
      entity_type: "report",
      entity_id: report.id,
      related: { incident_id: report.incident_id, category_id: categoryId, issue_type: issueType, scope: command.scope ?? report.scope },
      outcome: retriage ? "pending" : "linked",
      reason: command.reason,
    });
    // A corrected, unlinked report goes through the deterministic policy again at its new version.
    await enqueueReportWork(client, { id: report.id, version: report.version + 1 }, ctx.correlation_id, { triage: retriage });
  });
}

/** Responsibility, verification, dispute, closing and reopening of an incident. */
export async function runIncidentCommand(ctx: ActorContext, incidentId: string, command: IncidentCommand): Promise<void> {
  requireOfficial(ctx);
  await withTransaction(async (client) => {
    const incident = await findIncidentRow(client, incidentId, true);
    if (!incident) throw new ApiError(404, "not_found", "This incident does not exist.");
    if (incident.version !== command.expected_version) throw conflict();
    let reason: string | null = "reason" in command ? command.reason : null;
    let propose = true;

    switch (command.type) {
      case "choose_institution": {
        const institution = await client.query<{ id: string; name: string }>("SELECT id, name FROM institutions WHERE id = $1", [command.institution_id]);
        if (!institution.rows[0]) throw new ApiError(400, "invalid_request", "institution_id: unknown institution.");
        await assertCanPropose(client, incident);
        await client.query(
          "UPDATE incidents SET responsible_institution_id = $1, responsibility_rule_id = NULL, response_status = 'triaged' WHERE id = $2",
          [institution.rows[0].id, incident.id],
        );
        reason = institution.rows[0].name;
        propose = false;
        break;
      }
      case "verify":
      case "dispute": {
        const cited = command.evidence_ids ?? [];
        if (cited.length) {
          const known = await client.query(
            "SELECT 1 FROM incident_evidence WHERE incident_id = $1 AND removed_at IS NULL AND id = ANY($2::uuid[])",
            [incident.id, cited.filter(isUuid)],
          );
          if (known.rowCount !== new Set(cited).size) {
            throw new ApiError(400, "invalid_request", "evidence_ids: cite only evidence stored on this incident.");
          }
        }
        const assessment = command.type === "verify" ? "verified" : "disputed";
        if (incident.assessment === assessment) throw new ApiError(409, "invalid_state", `This incident is already ${assessment}.`);
        await client.query("UPDATE incidents SET assessment = $1 WHERE id = $2", [assessment, incident.id]);
        await addIncidentEvent(client, incident.id, assessment);
        break;
      }
      case "close":
        if (incident.response_status !== "resolved") throw new ApiError(409, "invalid_state", "Only a resolved incident can be closed.");
        await client.query(
          "UPDATE incidents SET response_status = 'closed', review_reason = NULL, review_note = NULL, review_since = NULL WHERE id = $1",
          [incident.id],
        );
        await addIncidentEvent(client, incident.id, "closed");
        break;
      case "reopen":
        if (incident.response_status !== "resolved" && incident.response_status !== "closed") {
          throw new ApiError(409, "invalid_state", "Only a resolved or closed incident can be reopened.");
        }
        // The earlier ticket stays terminal in history; a fresh responsibility decision is needed.
        await client.query(
          `UPDATE incidents SET response_status = 'triaged', responsible_institution_id = NULL, responsibility_rule_id = NULL,
                  review_reason = 'needs_responsibility', review_note = $1, review_since = now() WHERE id = $2`,
          [`Reopened: ${command.reason}`, incident.id],
        );
        await addIncidentEvent(client, incident.id, "reopened");
        break;
    }

    const version = await bumpIncidentVersion(client, incident.id, command.expected_version, { propose });
    if (version === null) throw conflict();
    if (command.type === "choose_institution") {
      await insertProposal(client, incident.id, {
        institution_id: command.institution_id,
        created_by: "Official (demo account)",
        explanation: `${reason} chosen by the official.`,
      });
    }
    await recordAudit(client, ctx, {
      operation: `incident.${command.type}`,
      entity_type: "incident",
      entity_id: incident.id,
      related: {
        incident_id: incident.id,
        incident_version: version,
        evidence_ids: "evidence_ids" in command && command.evidence_ids ? command.evidence_ids.join(",") : null,
      },
      outcome: command.type,
      reason,
    });
    await enqueueIncidentIndex(client, { id: incident.id, version }, ctx.correlation_id);
  });
}

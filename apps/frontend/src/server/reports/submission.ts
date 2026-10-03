import "server-only";

import type { ActorContext } from "@/server/actor-context";
import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db";
import { ApiError } from "@/server/http/api";
import { draftFieldsSchema, type Report } from "./contracts";
import { missingDraftFields } from "./draft-rules";
import { loadOwnedDraft, requireResident } from "./drafts";
import { findReportRow, projectReport, REPORT_COLUMNS, type ReportRow } from "./reports";
import { enqueueReportWork } from "./work";

/**
 * The one submission path for form and voice. The draft row lock serialises concurrent requests;
 * the report, the draft's submitted state, the audit event and the pending triage/index work
 * commit together or not at all. No provider is called inside this transaction.
 */
export async function submitDraft(
  ctx: ActorContext,
  input: { draft_id: string; revision: number },
): Promise<{ report: Report; replayed: boolean }> {
  const owner = requireResident(ctx);
  return withTransaction(async (client) => {
    const draft = await loadOwnedDraft(client, owner.id, input.draft_id, true);

    if (draft.report_id) {
      if (draft.submitted_revision !== input.revision) {
        throw new ApiError(409, "idempotency_conflict", "This draft was already submitted with different content.");
      }
      const existing = await findReportRow(client, draft.report_id);
      if (!existing) throw new Error("A submitted draft lost its report.");
      return { report: projectReport(existing), replayed: true };
    }

    if (draft.revision !== input.revision || draft.confirmed_revision !== draft.revision) {
      throw new ApiError(409, "not_confirmed", "Confirm the current summary and location before submitting.");
    }
    const fields = draftFieldsSchema.parse(draft.fields);
    const location = fields.location;
    if (missingDraftFields(fields).length || !location || !fields.category_id || !fields.issue_type || !fields.title) {
      throw new ApiError(409, "draft_incomplete", "The draft is missing required information.");
    }

    const inserted = await client.query<ReportRow>(
      `INSERT INTO reports
         (reference, owner_id, draft_id, submission_key, channel, category_id, issue_type, summary, original_observation,
          severity, lat, lng, location_label, street, building_number, unit, district, location_precision,
          location_source, location_candidate_id, observed_at, observed_time_state, scope, urgent)
       VALUES ('R-26-' || lpad(nextval('report_reference_seq')::text, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING ${REPORT_COLUMNS}`,
      [
        owner.id, draft.id, draft.submission_key, draft.confirmation_channel === "voice" ? "voice" : "form",
        fields.category_id, fields.issue_type, fields.title, fields.description ?? "", fields.severity,
        location.lat, location.lng, location.label, location.street, location.building_number, location.unit,
        location.district, location.precision, location.source, location.candidate_id,
        fields.observed_at, fields.observed_time_state, fields.scope, fields.urgent,
      ],
    );
    const report = inserted.rows[0];

    await client.query(
      "UPDATE report_drafts SET report_id = $1, submitted_revision = revision, updated_at = now() WHERE id = $2",
      [report.id, draft.id],
    );
    await recordAudit(client, ctx, {
      operation: "report.submit",
      entity_type: "report",
      entity_id: report.id,
      related: { draft_id: draft.id, revision: draft.revision, channel: report.channel, urgent: report.urgent },
      outcome: "pending_triage",
    });
    await enqueueReportWork(client, report, ctx.correlation_id, { triage: true });
    return { report: projectReport(report), replayed: false };
  });
}

import { z } from "zod";
import { draftFieldsSchema, draftLocationSchema, TRIAGE_STATES, REPORT_SCOPES } from "@/server/reports/contracts";

export { draftFieldsSchema, EMPTY_DRAFT_FIELDS } from "@/server/reports/contracts";
export type { DraftFields, DraftFieldsPatch, IntakeDraft, Report, ReportScope } from "@/server/reports/contracts";

const timestamp = z.iso.datetime({ offset: true });
export const intakeDraftSchema = z.object({
  id: z.uuid(), revision: z.number().int().positive(), submission_key: z.string().min(1),
  fields: draftFieldsSchema,
  missing_fields: z.array(z.enum(["category_id", "issue_type", "title", "location"])),
  readback_summary: z.string(),
  confirmation: z.object({ revision: z.number().int().positive(), channel: z.enum(["button", "voice"]), confirmed_at: timestamp }).nullable(),
  submission: z.object({ report_id: z.uuid(), reference: z.string().min(1), triage_state: z.enum(TRIAGE_STATES), submitted_at: timestamp }).nullable(),
  created_at: timestamp, updated_at: timestamp,
});

export const submittedReportSchema = z.object({
  id: z.uuid(), reference: z.string().min(1), channel: z.enum(["form", "voice"]),
  category_id: z.string(), issue_type: z.string(), summary: z.string(), original_observation: z.string(),
  severity: z.enum(["low", "medium", "high"]).nullable(), location: draftLocationSchema,
  observed_at: timestamp.nullable(), observed_time_state: z.enum(["known", "unknown"]),
  submitted_at: timestamp, scope: z.enum(REPORT_SCOPES), urgent: z.boolean(),
  triage_state: z.enum(TRIAGE_STATES), incident_id: z.string().nullable(),
  resident_next_step: z.string().nullable(), version: z.number().int().positive(), provenance: z.literal("demo"),
});

export const issueTypeSchema = z.object({ id: z.string(), category_id: z.string().nullable(), label: z.string() });
export type IssueType = z.infer<typeof issueTypeSchema>;

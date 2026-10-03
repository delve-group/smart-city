import { z } from "zod";
import { AssessmentError } from "./errors";

export const ASSESSMENT_SCHEMA_VERSION = "incident-assessment-v1";
export const MAX_INPUT_BYTES = 32 * 1024;
const id = z.string().trim().min(1).max(200);
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.iso.datetime({ offset: true });

/** Internal snapshot supplied by authorized domain adapters, never an HTTP/model authority input. */
export const assessmentInputSchema = z.object({
  incident: z.object({
    id,
    version,
    summary: z.string().trim().min(1).max(2_000),
    category_id: id.nullable(),
    issue_type: id.nullable(),
    scope: z.enum(["unit", "building", "street", "unknown"]),
    response_status: z.enum(["new", "triaged", "assigned", "in_progress", "resolved", "closed"]),
    urgent: z.boolean(),
  }).strict(),
  evidence: z.array(z.object({
    id,
    kind: z.enum(["report", "observation"]),
    source: z.string().trim().min(1).max(200),
    observed_at: timestamp.nullable(),
    retrieved_at: timestamp,
    provenance: z.enum(["demo", "live"]),
    state: z.enum(["current", "stale", "missing", "contradictory"]),
    text: z.string().trim().min(1).max(2_000),
  }).strict()).max(8),
  related_records: z.array(z.object({
    record_type: z.enum(["report", "incident", "service_ticket"]),
    record_id: id,
    version,
    excerpt: z.string().trim().min(1).max(500),
  }).strict()).max(20),
  retrieval_state: z.enum(["available", "degraded"]),
  allowed_actions: z.array(z.object({
    id,
    institution_id: id,
    action: z.literal("create_service_ticket"),
    // A description of the server-owned payload; the actual payload stays with its domain owner.
    payload_summary: z.string().trim().min(1).max(1_000),
  }).strict()).max(3),
}).strict();

export const assessmentOutputSchema = z.object({
  outcome: z.enum(["review", "propose"]),
  action_id: id.nullable(),
  evidence_ids: z.array(id).max(8),
  explanation: z.string().trim().min(1).max(1_000),
}).strict();

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export function parseAssessmentInput(value: unknown): AssessmentInput {
  const parsed = assessmentInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new AssessmentError("invalid_assessment_input", "The assessment snapshot is invalid or exceeds its limits.", false);
  }
  const input = parsed.data;
  if (!unique(input.evidence.map((item) => item.id))
    || !unique(input.allowed_actions.map((item) => item.id))
    || !unique(input.related_records.map((item) => JSON.stringify([item.record_type, item.record_id])))
    || new TextEncoder().encode(JSON.stringify(input)).byteLength > MAX_INPUT_BYTES) {
    throw new AssessmentError("invalid_assessment_input", "The assessment snapshot has duplicate references or exceeds its byte limit.", false);
  }
  return input;
}

/** Validate the selected references against the exact snapshot sent for this attempt. */
export function parseAssessmentOutput(value: unknown, input: AssessmentInput): AssessmentOutput {
  const parsed = assessmentOutputSchema.safeParse(value);
  if (!parsed.success) {
    throw new AssessmentError("invalid_assessment_output", "The provider returned an invalid assessment.", false);
  }
  const output = parsed.data;
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  const validAction = output.outcome === "review"
    ? output.action_id === null
    : output.evidence_ids.length > 0 && input.allowed_actions.some((item) => item.id === output.action_id);
  if (!validAction || !unique(output.evidence_ids) || output.evidence_ids.some((id) => !evidenceIds.has(id))) {
    throw new AssessmentError("invalid_assessment_output", "The assessment uses invalid action or evidence references.", false);
  }
  return output;
}

/** Match provider-side choices to the snapshot; local reference validation remains mandatory. */
export function assessmentJsonSchema(input: AssessmentInput) {
  const actionIds = input.allowed_actions.map((item) => item.id);
  const evidenceIds = input.evidence.map((item) => item.id);
  return z.toJSONSchema(assessmentOutputSchema.extend({
    action_id: actionIds.length ? z.enum(actionIds).nullable() : z.null(),
    evidence_ids: evidenceIds.length ? z.array(z.enum(evidenceIds)).max(8) : z.array(id).max(0),
  }), { target: "draft-07" });
}

import "server-only";
import { createHash } from "node:crypto";
import {
  ASSESSMENT_SCHEMA_VERSION, assessmentJsonSchema, parseAssessmentInput, parseAssessmentOutput,
  type AssessmentInput, type AssessmentOutput,
} from "./assessment";
import { requestStructuredCompletion } from "./completion";
import { ASSESSMENT_PROMPT_VERSION, ASSESSMENT_SYSTEM_PROMPT } from "./prompt";

export interface AssessmentResult {
  assessment: AssessmentOutput;
  basis: { incident_id: string; incident_version: number; snapshot_sha256: string };
  selected_action: AssessmentInput["allowed_actions"][number] | null;
  provider: "scaleway";
  response_id: string;
  requested_model: string;
  returned_model: string;
  prompt_version: string;
  schema_version: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; reasoning_tokens: number | null } | null;
  duration_ms: number;
}

/** One provider call, no domain writes or retry loop. The caller must persist/revalidate the result. */
export async function assessIncident(value: unknown, options: { signal?: AbortSignal } = {}): Promise<AssessmentResult> {
  const input = parseAssessmentInput(value);
  const snapshot = JSON.stringify(input);
  const result = await requestStructuredCompletion({
    name: "IncidentAssessment", system_prompt: ASSESSMENT_SYSTEM_PROMPT,
    snapshot, schema: assessmentJsonSchema(input),
  }, options);
  const { value: output, ...metadata } = result;
  const assessment = parseAssessmentOutput(output, input);
  return {
    ...metadata, provider: "scaleway", assessment,
    basis: { incident_id: input.incident.id, incident_version: input.incident.version,
      snapshot_sha256: createHash("sha256").update(snapshot).digest("hex") },
    selected_action: input.allowed_actions.find((item) => item.id === assessment.action_id) ?? null,
    prompt_version: ASSESSMENT_PROMPT_VERSION, schema_version: ASSESSMENT_SCHEMA_VERSION,
  };
}

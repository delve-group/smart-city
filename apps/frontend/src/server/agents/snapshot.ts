import type { IncidentContext } from "@/server/incidents/context";
import { parseAssessmentInput, type AssessmentInput } from "./assessment";

/** Preserve every stored evidence item; an oversized case is reviewed, never silently sliced. */
export function buildAssessmentSnapshot(
  context: IncidentContext,
  action: AssessmentInput["allowed_actions"][number],
  related: AssessmentInput["related_records"],
  retrievalState: AssessmentInput["retrieval_state"],
): AssessmentInput {
  const incident = context.incident;
  const summary = [
    incident.title,
    `Location: ${incident.public_label}. Scope: ${incident.scope}. Assessment: ${incident.assessment}.`,
    `Resident support: ${incident.support_count} demo identities, unverified.`,
    // Current service observations lack stored IDs. Include their complete state as
    // context without manufacturing an evidence reference the model could cite.
    ...context.observations.map((item) => `Current service context (not citable evidence): ${JSON.stringify(item)}`),
  ].join("\n");
  return parseAssessmentInput({
    incident: { id: incident.id, version: incident.version, summary, category_id: incident.category_id,
      issue_type: incident.issue_type, scope: incident.scope, response_status: incident.response_status, urgent: incident.urgent },
    evidence: context.evidence.map((item) => {
      const report = item.report_id ? context.reports.find((candidate) => candidate.id === item.report_id) : null;
      return { id: item.id, kind: item.kind, source: item.source, observed_at: item.observed_at,
        retrieved_at: item.retrieved_at, provenance: item.provenance, state: item.state,
        text: [item.label, item.note, report?.summary, report?.original_observation,
          report ? `Report scope: ${report.scope}. Observed time: ${report.observed_time_state}. Urgent: ${report.urgent}. Classification: ${report.category_id}/${report.issue_type}.` : null,
        ].filter(Boolean).join("\n") };
    }),
    related_records: related,
    retrieval_state: retrievalState,
    allowed_actions: [action],
  });
}

import { ApiError } from "@/server/http/errors";
import {
  REQUIRED_DRAFT_FIELDS,
  type DraftFields,
  type DraftFieldsPatch,
  type MissingField,
} from "./contracts";
import { categoryLabel, findIssueType, isKnownCategory, issueTypeFitsCategory } from "./issue-types";

/* Pure draft rules: merging an edit, what is still missing and the sentence read back. */

const FUTURE_TOLERANCE_MS = 5 * 60_000;

function invalid(message: string): ApiError {
  return new ApiError(400, "invalid_request", message);
}

/** Applies an edit and checks the result as a whole. Throws `invalid_request`; never half-applies. */
export function mergeDraftFields(current: DraftFields, patch: DraftFieldsPatch, now = new Date()): DraftFields {
  const next: DraftFields = { ...current, ...patch };

  // A given time is a known time; "unknown" clears any earlier value instead of keeping a guess.
  if (patch.observed_at && patch.observed_time_state === undefined) next.observed_time_state = "known";
  if (patch.observed_time_state === "unknown") {
    if (patch.observed_at) throw invalid("Send either an observation time or observed_time_state \"unknown\".");
    next.observed_at = null;
  }
  if (patch.observed_at === null && patch.observed_time_state === undefined) next.observed_time_state = "unknown";
  if (next.observed_time_state === "known" && !next.observed_at) {
    throw invalid("A known observation time needs observed_at.");
  }
  if (next.observed_at && Date.parse(next.observed_at) > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw invalid("The observation time cannot be in the future.");
  }

  if (next.category_id && !isKnownCategory(next.category_id)) throw invalid("Unknown category.");
  if (next.issue_type && !findIssueType(next.issue_type)) throw invalid("Unknown issue type.");
  if (next.category_id && next.issue_type && !issueTypeFitsCategory(next.issue_type, next.category_id)) {
    throw invalid("This issue type does not belong to the chosen category.");
  }
  return next;
}

export function missingDraftFields(fields: DraftFields): MissingField[] {
  return REQUIRED_DRAFT_FIELDS.filter((name) => fields[name] === null);
}

const SCOPE_TEXT: Record<DraftFields["scope"], string> = {
  unit: "affecting one flat or unit",
  building: "affecting the building",
  street: "affecting the street",
  unknown: "extent not known",
};

/** English readback of exactly the current revision; unknown facts are said to be unknown. */
export function readbackSummary(fields: DraftFields): string {
  const issue = fields.issue_type ? findIssueType(fields.issue_type)?.label : null;
  const category = fields.category_id ? categoryLabel(fields.category_id) : null;
  const what = issue && category ? `${issue} (${category})` : (issue ?? category ?? "Problem type not chosen yet");
  const where = fields.location
    ? `at ${fields.location.label}${fields.location.unit ? `, ${fields.location.unit}` : ""}`
    : "location not confirmed yet";
  const when = fields.observed_at ? `noticed at ${fields.observed_at}` : "time not known";
  const title = fields.title ? ` Summary: ${fields.title}.` : " No summary yet.";
  const urgent = fields.urgent ? " Reported as immediate danger: call 112; this report does not dispatch emergency services." : "";
  return `${what} ${where}, ${SCOPE_TEXT[fields.scope]}, ${when}.${title}${urgent}`;
}

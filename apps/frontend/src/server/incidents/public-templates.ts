import { findIssueType } from "@/server/reports/issue-types";

/* Controlled public wording. Resident text, staff reasons and institution notes never pass through here. */

export const TIMELINE_KINDS = [
  "reported", "corroborated", "verified", "disputed", "assigned", "acknowledged",
  "work_started", "resolved", "returned_to_review", "closed", "reopened",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

const TIMELINE_TEXT: Record<TimelineKind, string> = {
  reported: "First report received. Not yet confirmed by the city.",
  corroborated: "More residents reported the same problem. Still unverified.",
  verified: "The city verified this incident.",
  disputed: "The city has conflicting information and is checking.",
  assigned: "Sent to the responsible service (demo institution).",
  acknowledged: "The responsible service acknowledged the request.",
  work_started: "Work has started.",
  resolved: "The responsible service reported the problem as fixed.",
  returned_to_review: "The city is reviewing who should respond.",
  closed: "Closed by the city.",
  reopened: "Reopened by the city for another review.",
};

export function timelineText(kind: TimelineKind): string {
  return TIMELINE_TEXT[kind];
}

/** The issue label only: the place lives in its own field and is never repeated in a title (D083). */
export function incidentTitle(issueType: string): string {
  const issue = findIssueType(issueType);
  return issue && issue.id !== "other" ? issue.label : "Reported problem";
}

export function publicSummary(issueType: string): string {
  return `${incidentTitle(issueType)}, reported by residents.`;
}

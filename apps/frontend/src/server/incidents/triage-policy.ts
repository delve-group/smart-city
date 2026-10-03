import { buildingKey, metresBetween, serviceAreaId, streetKey, type LatLng } from "./geo";

/*
 * Deterministic grouping policy (feature specification §5). Pure: the caller supplies the
 * report and the current candidates and applies the decision in one transaction.
 * A search score or a model suggestion never enters this function.
 */

export const TRIAGE_POLICY = {
  version: 1,
  auto_category_id: "power",
  auto_issue_type: "power_outage",
  radius_m: 300,
  window_minutes: 60,
} as const;

export const ACTIVE_RESPONSE_STATUSES = ["new", "triaged", "assigned", "in_progress"] as const;

export interface TriageReportFacts {
  category_id: string;
  issue_type: string;
  location: LatLng;
  street: string | null;
  building_number: string | null;
  observed_at: Date | null;
  scope: "unit" | "building" | "street" | "unknown";
  urgent: boolean;
}

export interface TriageCandidate {
  id: string;
  category_id: string;
  issue_type: string;
  anchor: LatLng;
  anchor_observed_at: Date | null;
  service_area_id: string;
  street_key: string | null;
  building_key: string | null;
  response_status: string;
  assessment: string;
}

export type ReviewReason = "urgent" | "needs_link" | "private_scope";
export interface CandidateDistance {
  incident_id: string;
  distance_m: number;
  minutes_apart: number;
}

export type TriageDecision =
  | { outcome: "link"; incident_id: string; note: string }
  | { outcome: "new_incident"; note: string }
  | { outcome: "review"; reason: ReviewReason; note: string; candidates: CandidateDistance[] };

const isActive = (status: string) => (ACTIVE_RESPONSE_STATUSES as readonly string[]).includes(status);

export function decideTriage(report: TriageReportFacts, candidates: TriageCandidate[]): TriageDecision {
  const sameIssue = candidates.filter(
    (candidate) => isActive(candidate.response_status)
      && candidate.category_id === report.category_id
      && candidate.issue_type === report.issue_type,
  );

  // Everything near enough in space and time to be the same event, eligible or not.
  const near = report.observed_at
    ? sameIssue.flatMap((candidate) => {
        if (!candidate.anchor_observed_at) return [];
        const distance = metresBetween(report.location, candidate.anchor);
        const minutes = Math.abs(report.observed_at!.getTime() - candidate.anchor_observed_at.getTime()) / 60_000;
        // Both limits are inclusive and measured from the incident's fixed anchor, never from later reports.
        return distance <= TRIAGE_POLICY.radius_m && minutes <= TRIAGE_POLICY.window_minutes
          ? [{ candidate, distance_m: Math.round(distance), minutes_apart: Math.round(minutes) }]
          : [];
      })
    : sameIssue
        .map((candidate) => ({ candidate, distance_m: Math.round(metresBetween(report.location, candidate.anchor)), minutes_apart: 0 }))
        .filter((entry) => entry.distance_m <= TRIAGE_POLICY.radius_m);
  const nearList: CandidateDistance[] = near.map(({ candidate, distance_m, minutes_apart }) => ({
    incident_id: candidate.id,
    distance_m,
    minutes_apart,
  }));
  const review = (reason: ReviewReason, note: string): TriageDecision => ({ outcome: "review", reason, note, candidates: nearList });

  if (report.urgent) return review("urgent", "Reported as immediate danger. Review first; this ticket does not dispatch emergency services.");
  if (report.scope === "unit") return review("private_scope", "One flat or unit only. Kept private until the scope is reviewed.");
  if (report.category_id !== TRIAGE_POLICY.auto_category_id || report.issue_type !== TRIAGE_POLICY.auto_issue_type) {
    return review("needs_link", "Automatic grouping covers power outages only. Triage this report manually.");
  }
  if (report.scope === "unknown") return review("needs_link", "The affected extent is unknown.");
  if (!report.observed_at) return review("needs_link", "The observation time is unknown.");

  const reportStreet = streetKey(report.street);
  const reportBuilding = buildingKey(report.street, report.building_number);
  if (!reportStreet) return review("needs_link", "The street is unknown, so the report cannot be matched safely.");
  if (report.scope === "building" && !reportBuilding) return review("needs_link", "The building is unknown.");

  const area = serviceAreaId(report.location);
  const eligible = near.filter(({ candidate }) => {
    if (candidate.service_area_id !== area || candidate.assessment === "disputed") return false;
    // A building-only report needs the same building; a street report matches within its street.
    return report.scope === "building" ? candidate.building_key === reportBuilding : candidate.street_key === reportStreet;
  });

  if (eligible.length === 1 && near.length === 1) {
    const match = eligible[0];
    return {
      outcome: "link",
      incident_id: match.candidate.id,
      note: `Same ${report.scope === "building" ? "building" : "street"}, ${match.distance_m} m and ${match.minutes_apart} min from the first report.`,
    };
  }
  if (near.length === 0) return { outcome: "new_incident", note: "No active incident of this type nearby." };
  if (eligible.length > 1) return review("needs_link", "More than one incident matches. Choose the right one.");
  return review("needs_link", "A nearby incident may be the same event, but the street, building or service area differs.");
}

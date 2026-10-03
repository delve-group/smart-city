import type { PublicIncident } from "@/api/incidents/types";

/** Density of distinct supporters only; this weight is never verification or a probability. */
export function heatWeight(incident: Pick<PublicIncident, "support_count" | "response_status">): number {
  if (["resolved", "closed"].includes(incident.response_status)) return 0.1;
  return Math.max(0.1, Math.min(1, Math.log1p(incident.support_count) / Math.log1p(30)));
}

import type { PublicIncident } from "@/api/incidents/types";
import type { Translator } from "@/shared/i18n/locale";
import { localizedSummary } from "@/shared/utils/incident-summary";

/** A public incident's one-line summary in the chosen language. */
export function incidentSummary(t: Translator, incident: Pick<PublicIncident, "issue_type" | "public_summary" | "public_location">): string {
  return localizedSummary(t, {
    issueType: incident.issue_type,
    place: incident.public_location.label,
    precision: incident.public_location.precision === "building" ? "building" : "street",
    fallback: incident.public_summary,
  });
}

import type { PublicIncident } from "@/api/incidents/types";
import type { Translator } from "@/shared/i18n/locale";
import { localizedSummary } from "@/shared/utils/incident-summary";

/** A public incident's one-line title in the chosen language, without the place (shown separately). */
export function incidentSummary(t: Translator, incident: Pick<PublicIncident, "issue_type" | "public_summary" | "public_content">): string {
  return localizedSummary(t, { issueType: incident.issue_type, fallback: incident.public_summary, publicContent: incident.public_content });
}

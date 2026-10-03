import type { PublicIncident } from "@/api/incidents/types";
import { messages, type MessageKey } from "@/shared/i18n/messages";
import type { Translator } from "@/shared/i18n/locale";

/** The incident's one-line summary in the chosen language, built from its issue type and place; unknown types keep the server text. */
export function incidentSummary(t: Translator, incident: Pick<PublicIncident, "issue_type" | "public_summary" | "public_location">): string {
  const issueKey = `issueType.${incident.issue_type}`;
  if (!(issueKey in messages.en)) return incident.public_summary;
  const shape = incident.public_location.precision === "building" ? "building" : "street";
  return t(`incidentMap.summary.${shape}`, { issue: t(issueKey as MessageKey), place: incident.public_location.label });
}

import type { PublicIncident } from "@/api/incidents/types";

export const ASSESSMENT_LABEL: Record<PublicIncident["assessment"], string> = {
  suspected: "Suspected", corroborated: "Corroborated", verified: "Officially verified", disputed: "Disputed",
};
export const RESPONSE_LABEL: Record<PublicIncident["response_status"], string> = {
  new: "Awaiting triage", triaged: "Triaged", assigned: "Assigned", in_progress: "Work in progress", resolved: "Resolved", closed: "Closed",
};
export const ASSESSMENT_HINT: Record<PublicIncident["assessment"], string> = {
  suspected: "Reported observations need assessment.",
  corroborated: "Several distinct identities support this incident. This does not mean official verification.",
  verified: "A city official has verified this incident.",
  disputed: "The current evidence is disputed; follow the response updates separately.",
};

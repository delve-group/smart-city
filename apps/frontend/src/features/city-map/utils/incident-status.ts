import type { PublicIncident } from "@/api/incidents/types";

/** The four steps a resident follows; the API's response states fold into them. */
export const STATUS_STEPS = ["reported", "confirmed", "in_progress", "resolved"] as const;
export type ResidentStatus = (typeof STATUS_STEPS)[number];

const STEP_OF: Record<PublicIncident["response_status"], ResidentStatus> = {
  new: "reported",
  triaged: "confirmed",
  assigned: "confirmed",
  in_progress: "in_progress",
  resolved: "resolved",
  closed: "resolved",
};

export const residentStatus = (incident: Pick<PublicIncident, "response_status">): ResidentStatus => STEP_OF[incident.response_status];

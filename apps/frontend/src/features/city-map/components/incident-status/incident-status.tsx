import { Badge } from "@appica/ui-react/badge";
import type { PublicIncident } from "@/api/incidents/types";
import { ASSESSMENT_LABEL, RESPONSE_LABEL } from "../../utils/incident-status";

export function IncidentStatus({ incident }: { incident: PublicIncident }) {
  return <div className="flex flex-wrap gap-2">
    <Badge size="sm" variant={incident.assessment === "verified" ? "success" : incident.assessment === "disputed" ? "warning" : "outline"}>Assessment: {ASSESSMENT_LABEL[incident.assessment]}</Badge>
    <Badge size="sm" variant={incident.response_status === "resolved" ? "success" : incident.response_status === "in_progress" ? "warning" : "soft"}>Response: {RESPONSE_LABEL[incident.response_status]}</Badge>
  </div>;
}

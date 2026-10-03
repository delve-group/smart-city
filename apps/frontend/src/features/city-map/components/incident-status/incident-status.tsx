import { Badge } from "@appica/ui-react/badge";
import type { PublicIncident } from "@/api/incidents/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

export function IncidentStatus({ incident }: { incident: PublicIncident }) {
  const { t } = useI18n();
  return <div className="flex flex-wrap gap-2">
    <Badge size="sm" variant={incident.assessment === "verified" ? "success" : incident.assessment === "disputed" ? "warning" : "outline"}>{t("incidentMap.assessment", { value: t(`assessment.${incident.assessment}` as MessageKey) })}</Badge>
    <Badge size="sm" variant={incident.response_status === "resolved" ? "success" : incident.response_status === "in_progress" ? "warning" : "soft"}>{t("incidentMap.response", { value: t(`response.${incident.response_status}` as MessageKey) })}</Badge>
  </div>;
}

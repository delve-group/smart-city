import { Badge } from "@appica/ui-react/badge";
import type { PublicIncident } from "@/api/incidents/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { residentStatus, type ResidentStatus } from "../../utils/incident-status";

const VARIANT = {
  reported: "outline",
  confirmed: "soft",
  in_progress: "warning",
  resolved: "success",
} as const satisfies Record<ResidentStatus, string>;

/** One badge for where the fix stands; a dot while work is under way. */
export function IncidentStatus({ incident }: { incident: PublicIncident }) {
  const { t } = useI18n();
  const status = residentStatus(incident);
  return (
    <Badge variant={VARIANT[status]} size="sm" className="gap-1.5">
      {status === "in_progress" && (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {t(`status.${status}` as MessageKey)}
    </Badge>
  );
}

import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, useI18n, translateServerText } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { residentStatus } from "../../utils/incident-status";
import { incidentSummary } from "../../utils/incident-summary";

export function SearchIncidentOption({ incident, category }: { incident: PublicIncident; category?: Category }) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile categoryId={incident.category_id} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{incidentSummary(t, incident)}</span>
        <span className="truncate text-xs text-foreground-muted">
          {translateServerText(t, incident.public_location.label)} · {t(`status.${residentStatus(incident)}` as MessageKey)}
          {category && <span className="sr-only">, {categoryText(t, category).label}</span>}
        </span>
      </span>
    </span>
  );
}

import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

export function SearchIncidentOption({ incident, category }: { incident: PublicIncident; category?: Category }) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile categoryId={incident.category_id} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{incident.public_summary}</span>
        <span className="truncate text-xs text-foreground-muted">
          {incident.public_location.label} · {t(`response.${incident.response_status}` as MessageKey)}
          {category && <span className="sr-only">, {categoryText(t, category).label}</span>}
        </span>
      </span>
    </span>
  );
}

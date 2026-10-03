import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { RESPONSE_LABEL } from "../../utils/incident-status";

export function SearchIncidentOption({ incident, category }: { incident: PublicIncident; category?: Category }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile categoryId={incident.category_id} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{incident.public_summary}</span>
        <span className="truncate text-xs text-foreground-muted">
          {incident.public_location.label} · {RESPONSE_LABEL[incident.response_status]}
          {category && <span className="sr-only">, {category.label}</span>}
        </span>
      </span>
    </span>
  );
}

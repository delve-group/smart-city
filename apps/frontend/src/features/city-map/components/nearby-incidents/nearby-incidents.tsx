import { useI18n, translateServerText } from "@/shared/i18n/locale";
import { Button } from "@appica/ui-react/button";
import type { PublicIncident } from "@/api/incidents/types";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { nearbyIncidents, formatDistance } from "../../utils/nearby-incidents";
import { incidentSummary } from "../../utils/incident-summary";

export function NearbyIncidents({ incident, incidents, onSelect }: { incident: PublicIncident; incidents: readonly PublicIncident[]; onSelect: (incident: PublicIncident) => void }) {
  const { t } = useI18n();
  const nearby = nearbyIncidents(incident, incidents);
  return <PanelAccordionItem value="nearby" title={t("report.nearby")} meta={nearby.length}>
    {nearby.length ? <ul className="flex flex-col gap-1">{nearby.map(({ incident: other, meters }) => <li key={other.id}>
      <Button variant="ghost" className="h-auto w-full justify-start gap-3 py-3 text-start" onClick={() => onSelect(other)}>
        <CategoryTile categoryId={other.category_id} /><span className="flex min-w-0 flex-1 flex-col whitespace-normal"><span>{incidentSummary(t, other)}</span><span className="text-xs text-foreground-muted">{translateServerText(t, other.public_location.label)}</span></span><span className="text-xs text-foreground-muted">{formatDistance(meters)}</span>
      </Button>
    </li>)}</ul> : <p className="text-sm text-foreground-muted">{t("incidentMap.nearbyEmpty")}</p>}
  </PanelAccordionItem>;
}

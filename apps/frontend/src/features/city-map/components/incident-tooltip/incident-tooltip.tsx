import { Clock, MapPin, Users } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import type { PublicIncident } from "@/api/incidents/types";
import { CategoryLabel } from "@/shared/components/category-label/category-label";
import { useI18n, tCount } from "@/shared/i18n/locale";
import { formatAgo } from "@/shared/utils/format-time";
import { IncidentStatus } from "../incident-status/incident-status";

const OFFSET = 16;
const WIDTH = 288;

type IncidentTooltipProps = {
  incident: PublicIncident;
  category: Category;
  now: number;
  /** Pointer position relative to the map. */
  x: number;
  y: number;
  bounds: { width: number; height: number };
};

/** Follows the pointer and flips away from the nearest edge. Purely informational. */
export function IncidentTooltip({ incident, category, now, x, y, bounds }: IncidentTooltipProps) {
  const { t, locale } = useI18n();
  const flipX = x + OFFSET + WIDTH > bounds.width;
  const flipY = y > bounds.height * 0.6;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 flex w-72 flex-col gap-2.5 rounded-md border border-border bg-background p-3.5 shadow-md transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
      style={{
        left: x,
        top: y,
        transform: `translate(${flipX ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`}, ${flipY ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`})`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <CategoryLabel category={category} />
        <IncidentStatus incident={incident} />
      </div>
      <p className="line-clamp-2 text-base leading-snug font-semibold text-balance text-foreground-intense">
        {incident.public_summary}
      </p>
      <dl className="flex flex-col gap-1.5 text-sm text-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t("common.where")}</dt>
          <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd className="line-clamp-1">{incident.public_location.label}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t("common.reported")}</dt>
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd>{t("report.reportedAgo", { when: formatAgo(incident.created_at, now, locale) })}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t("incidentMap.supportersLabel")}</dt>
          <Users size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd>
            {tCount(t, locale, "incidentMap.supporters", incident.support_count)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-foreground-muted">{t("report.click")}</p>
    </div>
  );
}

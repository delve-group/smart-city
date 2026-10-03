"use client";

import { InfoCircle } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, tCount, useI18n } from "@/shared/i18n/locale";
import { formatAgo } from "@/shared/utils/format-time";
import { formatDistance, nearbyReports } from "../../utils/nearby-reports";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";

type NearbyReportsProps = {
  report: CityReport;
  reports: readonly CityReport[];
  category: Category;
  now: number;
  onSelect: (report: CityReport) => void;
};

/** Related problems around the report — the hint that one cause may sit behind several reports. */
export function NearbyReports({ report, reports, category, now, onSelect }: NearbyReportsProps) {
  const { t, locale } = useI18n();
  const nearby = nearbyReports(report, reports);
  const sameCategory = nearby.filter(({ report: other }) => other.categoryId === report.categoryId).length;
  const categoryLabel = categoryText(t, category).label.toLocaleLowerCase(locale);

  return (
    <PanelAccordionItem value="nearby" title={t("report.nearby")} meta={nearby.length}>
      {sameCategory >= 2 && (
        <div className="flex gap-3 rounded-md bg-background-muted p-3 text-sm">
          <InfoCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-foreground-muted" />
          <p className="text-foreground">
            <span className="font-medium text-foreground-intense">
              {tCount(t, locale, "report.nearbyCluster", sameCategory, { category: categoryLabel })}
            </span>{" "}
            {t("report.nearbyCause")}
          </p>
        </div>
      )}
      {nearby.length === 0 ? (
        <p className="text-sm text-foreground-muted">{t("report.nearbyEmpty")}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {nearby.map(({ report: other, meters }) => (
            <li key={other.id}>
              <button
                type="button"
                onClick={() => onSelect(other)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-start transition-colors duration-150 hover:bg-background-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <CategoryTile categoryId={other.categoryId} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground-intense">{other.title}</span>
                  <span className="truncate text-xs text-foreground-muted">
                    {t("report.nearbyMeta", { when: formatAgo(other.reportedAt, now, locale), count: other.confirmations })}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-foreground-muted tabular-nums">{formatDistance(meters)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelAccordionItem>
  );
}

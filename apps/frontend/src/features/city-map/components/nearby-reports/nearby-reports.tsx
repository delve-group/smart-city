import { InfoCircle } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { formatAgo } from "../../utils/format-time";
import { formatDistance, nearbyReports } from "../../utils/nearby-reports";
import { PanelSection } from "../panel-section/panel-section";

type NearbyReportsProps = {
  report: CityReport;
  reports: readonly CityReport[];
  category: Category;
  now: number;
  onSelect: (report: CityReport) => void;
};

/** Related problems around the report — the hint that one cause may sit behind several reports. */
export function NearbyReports({ report, reports, category, now, onSelect }: NearbyReportsProps) {
  const nearby = nearbyReports(report, reports);
  const sameCategory = nearby.filter(({ report: other }) => other.categoryId === report.categoryId).length;

  return (
    <PanelSection title="Nearby">
      {sameCategory >= 2 && (
        <div className="flex gap-3 rounded-md bg-info-subtle p-3 text-sm">
          <InfoCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-info-emphasis" />
          <p className="text-foreground">
            <span className="font-medium text-foreground-intense">
              {sameCategory} more {category.label.toLowerCase()} reports
            </span>{" "}
            within 600 m — possibly the same cause.
          </p>
        </div>
      )}
      {nearby.length === 0 ? (
        <p className="text-sm text-foreground-muted">No other open reports within 600 m.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {nearby.map(({ report: other, meters }) => (
            <li key={other.id}>
              <button
                type="button"
                onClick={() => onSelect(other)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors duration-150 hover:bg-background-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <CategoryTile categoryId={other.categoryId} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground-intense">{other.title}</span>
                  <span className="truncate text-xs text-foreground-muted">
                    {formatAgo(other.reportedAt, now)} · {other.confirmations} confirmed
                  </span>
                </span>
                <span className="shrink-0 text-xs text-foreground-muted tabular-nums">{formatDistance(meters)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

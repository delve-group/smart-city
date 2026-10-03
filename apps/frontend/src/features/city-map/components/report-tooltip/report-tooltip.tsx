import { Clock, MapPin, Users } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryLabel } from "@/shared/components/category-label/category-label";
import { formatAgo } from "../../utils/format-time";
import { ReportStatusBadge } from "../report-status-badge/report-status-badge";

const OFFSET = 16;
const WIDTH = 288;

type ReportTooltipProps = {
  report: CityReport;
  category: Category;
  now: number;
  /** Pointer position relative to the map. */
  x: number;
  y: number;
  bounds: { width: number; height: number };
};

/** Follows the pointer and flips away from the nearest edge. Purely informational. */
export function ReportTooltip({ report, category, now, x, y, bounds }: ReportTooltipProps) {
  const flipX = x + OFFSET + WIDTH > bounds.width;
  const flipY = y > bounds.height * 0.6;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 flex w-72 flex-col gap-2.5 rounded-lg border border-border bg-background p-3.5 shadow-lg transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
      style={{
        left: x,
        top: y,
        transform: `translate(${flipX ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`}, ${flipY ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`})`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <CategoryLabel category={category} />
        <ReportStatusBadge status={report.status} />
      </div>
      <p className="line-clamp-2 text-base leading-snug font-semibold text-balance text-foreground-intense">
        {report.title}
      </p>
      <dl className="flex flex-col gap-1.5 text-sm text-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Where</dt>
          <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd className="line-clamp-1">{report.address}{report.district ? `, ${report.district}` : ""}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Reported</dt>
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd>Reported {formatAgo(report.reportedAt, now)}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Confirmations</dt>
          <Users size={16} aria-hidden className="mt-0.5 shrink-0 text-foreground-subtle" />
          <dd>
            {report.confirmations === 1 ? "1 resident reported this" : `${report.confirmations} residents confirmed`}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-foreground-muted">Click the point for details</p>
    </div>
  );
}

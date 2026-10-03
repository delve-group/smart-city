import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { STATUS_LABEL } from "../../utils/report-status";

export function SearchReportOption({ report, category }: { report: CityReport; category?: Category }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile categoryId={report.categoryId} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{report.title}</span>
        <span className="truncate text-xs text-foreground-muted">
          {report.address} · {STATUS_LABEL[report.status]}
          {category && <span className="sr-only">, {category.label}</span>}
        </span>
      </span>
    </span>
  );
}

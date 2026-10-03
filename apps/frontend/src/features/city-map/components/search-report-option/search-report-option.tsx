"use client";

import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";
import { CategoryTile } from "@/shared/components/category-tile/category-tile";
import { categoryText, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

export function SearchReportOption({ report, category }: { report: CityReport; category?: Category }) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <CategoryTile categoryId={report.categoryId} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground-intense">{report.title}</span>
        <span className="truncate text-xs text-foreground-muted">
          {report.address} · {t(`status.${report.status}` as MessageKey)}
          {category && <span className="sr-only">, {categoryText(t, category).label}</span>}
        </span>
      </span>
    </span>
  );
}

"use client";

import type { CityReport } from "@/api/reports/types";
import { useI18n } from "@/shared/i18n/locale";
import { formatDateTime } from "@/shared/utils/format-time";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";

export function ReportDetails({ report, now }: { report: CityReport; now: number }) {
  const { t, locale } = useI18n();
  const facts = [
    { label: t("report.location"), value: [report.address, report.district].filter(Boolean).join(", ") },
    { label: t("common.reported"), value: formatDateTime(report.reportedAt, now, locale) },
    { label: t("report.lastUpdate"), value: formatDateTime(report.updatedAt, now, locale) },
    { label: t("common.source"), value: report.source === "city" ? t("report.sourceCity") : t("report.sourceResident") },
    { label: t("common.reference"), value: report.reference },
  ];

  return (
    <PanelAccordionItem value="details" title={t("common.details")}>
      {report.description && <p className="text-sm leading-relaxed text-pretty text-foreground">{report.description}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-foreground-muted">{fact.label}</dt>
            <dd className="text-foreground-intense">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </PanelAccordionItem>
  );
}

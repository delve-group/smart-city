"use client";

import { Check } from "@appica/icons-react";
import type { CityReport } from "@/api/reports/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatDateTime } from "@/shared/utils/format-time";
import { STATUS_STEPS } from "../../utils/report-status";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";

export function ReportProgress({ report, now }: { report: CityReport; now: number }) {
  const { t, locale } = useI18n();
  const current = STATUS_STEPS.indexOf(report.status);

  return (
    <PanelAccordionItem value="progress" title={t("report.progress")}>
      <ol className="flex flex-col">
        {STATUS_STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
              {index < STATUS_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-6 bottom-0 left-[0.6875rem] w-px ${done ? "bg-primary" : "bg-border"}`}
                />
              )}
              <span
                aria-hidden
                className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-background"
                      : "border-border bg-background"
                }`}
              >
                {done && <Check size={14} strokeWidth={3} />}
                {active && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <span className={`text-sm ${active ? "font-semibold text-foreground-intense" : done ? "text-foreground" : "text-foreground-muted"}`}>
                  {t(`status.${step}` as MessageKey)}
                  <span className="sr-only">{done ? ` (${t("common.done")})` : active ? ` (${t("common.current")})` : ` (${t("common.pending")})`}</span>
                </span>
                {active && <span className="text-sm text-foreground-muted">{t(`status.${step}Hint` as MessageKey)}</span>}
                {active && step === "in_progress" && report.expectedFixAt && (
                  <span className="text-sm font-medium text-foreground-intense">
                    {t("report.expectedFix", { when: formatDateTime(report.expectedFixAt, now, locale) })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {report.responsible && (
        <p className="text-sm text-foreground-muted">
          {t("report.responsible")} <span className="text-foreground-intense">{report.responsible}</span>
        </p>
      )}
    </PanelAccordionItem>
  );
}

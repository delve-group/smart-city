import { Check } from "@appica/icons-react";
import type { CityReport } from "@/api/reports/types";
import { formatDateTime } from "../../utils/format-time";
import { STATUS_HINT, STATUS_LABEL, STATUS_STEPS } from "../../utils/report-status";
import { PanelAccordionItem } from "../panel-accordion-item/panel-accordion-item";

export function ReportProgress({ report, now }: { report: CityReport; now: number }) {
  const current = STATUS_STEPS.indexOf(report.status);

  return (
    <PanelAccordionItem value="progress" title="Progress">
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
                  {STATUS_LABEL[step]}
                  <span className="sr-only">{done ? " (done)" : active ? " (current)" : " (pending)"}</span>
                </span>
                {active && <span className="text-sm text-foreground-muted">{STATUS_HINT[step]}</span>}
                {active && step === "in_progress" && report.expectedFixAt && (
                  <span className="text-sm font-medium text-foreground-intense">
                    Expected fix: {formatDateTime(report.expectedFixAt, now)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {report.responsible && (
        <p className="text-sm text-foreground-muted">
          Responsible: <span className="text-foreground-intense">{report.responsible}</span>
        </p>
      )}
    </PanelAccordionItem>
  );
}

import { Lock, Microphone, Forms } from "@appica/icons-react";
import type { OperationsReport } from "@/api/operations/types";
import { PanelAccordionItem } from "@/shared/components/panel-accordion-item/panel-accordion-item";
import { formatAgo } from "@/shared/utils/format-time";

type LinkedReportsProps = {
  reports: readonly OperationsReport[];
  now: number;
  onLocate: (report: OperationsReport) => void;
};

/** Resident reports behind the incident. Staff see the operator summary and unit detail; the public never does. */
export function LinkedReports({ reports, now, onLocate }: LinkedReportsProps) {
  return (
    <PanelAccordionItem value="reports" title="Reports" meta={reports.length}>
      <ul className="flex flex-col">
        {reports.map((report) => {
          const ChannelIcon = report.channel === "voice" ? Microphone : Forms;
          return (
            <li key={report.id} className="border-b border-border-muted last:border-0">
              <button
                type="button"
                onClick={() => onLocate(report)}
                className="flex w-full flex-col gap-1 rounded-sm py-3 text-start transition-colors outline-none hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span className="font-mono text-foreground-intense">{report.reference}</span>
                  <ChannelIcon size={14} aria-hidden />
                  <span>{report.channel === "voice" ? "Voice" : "Form"}</span>
                  <span aria-hidden>·</span>
                  <span>{formatAgo(report.submittedAt, now)}</span>
                  {!report.observedAt && <span>· time observed unknown</span>}
                </span>
                <span className="text-sm text-pretty text-foreground">{report.summary}</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  {report.address}
                  {report.unit && (
                    <>
                      <Lock size={12} aria-hidden />
                      <span>{report.unit} · staff only</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </PanelAccordionItem>
  );
}

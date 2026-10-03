import { AlertTriangle, Users } from "@appica/icons-react";
import type { CityReport } from "@/api/reports/types";
import { SEVERITY_LABEL } from "../../utils/report-status";
import { PanelSection } from "../panel-section/panel-section";

const count = new Intl.NumberFormat("en-GB");

export function ReportImpact({ report }: { report: CityReport }) {
  return (
    <PanelSection title="Impact">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
          <span className="text-2xl font-semibold tracking-tight text-foreground-intense tabular-nums">
            {count.format(report.confirmations)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <Users size={14} aria-hidden />
            {report.confirmations === 1 ? "resident reported" : "residents confirmed"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
          <span className={`text-sm font-semibold ${report.severity === "high" ? "text-error-emphasis" : "text-foreground-intense"}`}>
            {SEVERITY_LABEL[report.severity]}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <AlertTriangle size={14} aria-hidden />
            Severity
          </span>
        </div>
      </div>
      {report.affected && (
        <p className="text-sm text-foreground">
          Affects <span className="font-medium text-foreground-intense">{report.affected}</span>.
        </p>
      )}
    </PanelSection>
  );
}

import { AlertTriangle, Users } from "@appica/icons-react";
import type { CityReport } from "@/api/reports/types";
import { tCount, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { AffectedButton } from "../affected-button/affected-button";
import { PanelSection } from "../panel-section/panel-section";

const count = new Intl.NumberFormat("en-GB");

type ReportImpactProps = {
  report: CityReport;
  affected: boolean;
  onConfirm: () => Promise<void>;
};

export function ReportImpact({ report, affected, onConfirm }: ReportImpactProps) {
  const { t, locale } = useI18n();
  return (
    <PanelSection title={t("report.impact")}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
          <span className="text-sm font-semibold text-foreground-intense tabular-nums">
            {count.format(report.confirmations)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <Users size={14} aria-hidden />
            {tCount(t, locale, "residentNoun", report.confirmations)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-background-muted p-3">
          <span className={`text-sm font-semibold ${report.severity === "high" ? "text-error-emphasis" : "text-foreground-intense"}`}>
            {t(`severity.${report.severity}` as MessageKey)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <AlertTriangle size={14} aria-hidden />
            {t("report.severity")}
          </span>
        </div>
      </div>
      {report.affected && (
        <p className="text-sm text-foreground">
          {t("report.affects", { who: report.affected })}
        </p>
      )}
      {report.status !== "resolved" && <AffectedButton key={report.id} affected={affected} onConfirm={onConfirm} />}
    </PanelSection>
  );
}

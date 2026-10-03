import { AlertTriangle, Users } from "@appica/icons-react";
import type { CityReport } from "@/api/reports/types";
import { tCount, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { AffectedButton } from "../affected-button/affected-button";

type ReportImpactProps = {
  report: CityReport;
  affected: boolean;
  onConfirm: () => Promise<void>;
};

export function ReportImpact({ report, affected, onConfirm }: ReportImpactProps) {
  const { t, locale } = useI18n();
  const count = new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB");
  return (
    <section className="flex flex-col gap-3 pt-3 pb-5">
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
          {t("report.affects", { who: affectedText(t, report.affected) })}
        </p>
      )}
      {report.status !== "resolved" && <AffectedButton key={report.id} affected={affected} onConfirm={onConfirm} />}
    </section>
  );
}

function affectedText(t: ReturnType<typeof useI18n>["t"], affected: string): string {
  if (affected === "about 1,200 households") return t("report.affectedHouseholds1200");
  if (affected === "about 30 buildings without water") return t("report.affectedBuildings30");
  return affected;
}

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import type { Report } from "@/api/intake/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

export function ReportOutcome({ report, busy, onRefresh, onNew }: { report: Pick<Report, "reference" | "triage_state" | "resident_next_step">; busy: boolean; onRefresh: () => void; onNew: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="success">
        <AlertTitle>{t("report.saved")}</AlertTitle>
        <AlertDescription>{t("report.savedReference", { reference: report.reference })}</AlertDescription>
      </Alert>
      <p className="text-sm">{t(`report.status.${report.triage_state}` as MessageKey)}</p>
      {report.resident_next_step && <p className="text-sm">{report.resident_next_step}</p>}
      <Button variant="outline" disabled={busy} onClick={onRefresh}>{t("report.checkStatus")}</Button>
      <Button disabled={busy} onClick={onNew}>{t("report.createAnother")}</Button>
    </div>
  );
}

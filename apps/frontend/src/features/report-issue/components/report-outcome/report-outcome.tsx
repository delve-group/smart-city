import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useState } from "react";
import type { Report } from "@/api/intake/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

export function ReportOutcome({ report, busy, onRefresh, onNew }: { report: Pick<Report, "reference" | "triage_state" | "resident_next_step">; busy: boolean; onRefresh: () => Promise<boolean>; onNew: () => void }) {
  const { t, locale } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const blocked = busy || refreshing;

  async function refresh() {
    if (blocked) return;
    setRefreshing(true);
    setCheckedAt(null);
    try {
      if (await onRefresh()) setCheckedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  const checkedTime = checkedAt ? new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(checkedAt) : null;
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="success">
        <AlertTitle>{t("report.saved")}</AlertTitle>
        <AlertDescription>{t("report.savedReference", { reference: report.reference })}</AlertDescription>
      </Alert>
      <p className="text-sm">{t(`report.status.${report.triage_state}` as MessageKey)}</p>
      {report.resident_next_step && <p className="text-sm">{report.resident_next_step}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="outline" focusableWhenDisabled disabled={blocked} aria-busy={refreshing} onClick={() => void refresh()}>
          {refreshing && <Spinner currentColor className="text-base" data-icon="start" aria-hidden />}
          {refreshing ? t("report.checkingStatus") : t("report.checkStatus")}
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-xs text-foreground-muted">
          {checkedTime ? t("report.statusCheckedAt", { time: checkedTime }) : <span className="sr-only">{refreshing ? t("report.checkingStatus") : null}</span>}
        </p>
      </div>
      <Button disabled={blocked} onClick={onNew}>{t("report.createAnother")}</Button>
    </div>
  );
}

"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useI18n } from "@/shared/i18n/locale";

type DataStatusProps =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void };

/** Loading pill and load error, floating above the map. */
export function DataStatus(props: DataStatusProps) {
  const { t } = useI18n();
  if (props.status === "loading") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground shadow-sm"
      >
        <Spinner className="size-4 text-foreground-muted" aria-hidden />
        {t("report.loading")}
      </div>
    );
  }

  return (
    <Alert variant="error" className="max-w-sm shadow-sm">
      <AlertTitle>{t("report.loadError")}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        {props.message}
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          {t("common.tryAgain")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

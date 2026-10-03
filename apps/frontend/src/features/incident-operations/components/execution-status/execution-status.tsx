import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useState } from "react";
import type { Proposal } from "@/api/operations/types";
import { useI18n } from "@/shared/i18n/locale";
import { ReasonForm } from "../reason-form/reason-form";

type ExecutionStatusProps = {
  proposal: Proposal;
  institutionName: string;
  onReconcile: (reason: string) => Promise<boolean>;
};

/** Between approval and a ticket: sending, or an outcome nobody knows yet. Never claims a ticket exists. */
export function ExecutionStatus({ proposal, institutionName, onReconcile }: ExecutionStatusProps) {
  const { t } = useI18n();
  const [reconciling, setReconciling] = useState(false);

  if (proposal.state !== "unknown") {
    return (
      <div role="status" className="flex items-start gap-3 text-sm text-foreground">
        <Spinner className="mt-0.5 size-4 text-foreground-muted" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground-intense">{t("execution.sending", { name: institutionName })}</span>
          <span className="text-foreground-muted">{t("execution.waiting")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="warning">
        <AlertTitle as="h3">{t("execution.unknown")}</AlertTitle>
        <AlertDescription className="text-pretty">
          {t("execution.unknownBody", { name: institutionName })}
        </AlertDescription>
      </Alert>
      {reconciling ? (
        <ReasonForm
          label={t("execution.why")}
          placeholder={t("execution.whyPlaceholder")}
          submitLabel={t("execution.check")}
          onCancel={() => setReconciling(false)}
          onSubmit={onReconcile}
        />
      ) : (
        <Button variant="outline" onClick={() => setReconciling(true)}>{t("execution.checkButton")}</Button>
      )}
    </div>
  );
}

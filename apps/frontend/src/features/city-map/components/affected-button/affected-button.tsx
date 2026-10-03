import { UserCheck, UsersPlus } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { useState } from "react";
import { useI18n } from "@/shared/i18n/locale";

type AffectedButtonProps = {
  /** This browser already confirmed (or submitted) the report. */
  affected: boolean;
  onConfirm: () => Promise<void>;
};

/** "I'm affected too": adds the resident's weight to an existing report instead of a duplicate. */
export function AffectedButton({ affected, onConfirm }: AffectedButtonProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  if (affected) {
    return (
      <p className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-border text-sm text-foreground-muted">
        <UserCheck size={16} aria-hidden />
        {t("report.affectedYou")}
      </p>
    );
  }

  return (
    <Button variant="outline" size="lg" className="w-full" disabled={pending} onClick={handleClick}>
      {pending ? <Spinner data-icon="start" /> : <UsersPlus data-icon="start" />}
      {t("report.affectedToo")}
    </Button>
  );
}

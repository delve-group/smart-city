import { Button } from "@appica/ui-react/button";
import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Textarea } from "@appica/ui-react/textarea";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/shared/i18n/locale";

type ReasonFormProps = {
  label: string;
  placeholder: string;
  submitLabel: string;
  destructive?: boolean;
  /** Resolves true when the command succeeded; the form then closes itself through the parent. */
  onSubmit: (reason: string) => Promise<boolean>;
  onCancel: () => void;
};

/** Inline "say why" step for decisions the audit log must explain: reject, dispute, reopen. */
export function ReasonForm({ label, placeholder, submitLabel, destructive = false, onSubmit, onCancel }: ReasonFormProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError(t("validation.why"));
      return;
    }
    setBusy(true);
    const done = await onSubmit(reason.trim());
    // On failure keep the text, so nothing typed is lost.
    if (!done) setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <Field invalid={Boolean(error)}>
        <FieldLabel>{label}</FieldLabel>
        <Textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          placeholder={placeholder}
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError(null);
          }}
        />
        <FieldError match={Boolean(error)}>{error}</FieldError>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant={destructive ? "destructive" : "primary"} disabled={busy} className="flex-1">
          {busy ? t("common.saving") : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

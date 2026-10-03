import { Button } from "@appica/ui-react/button";
import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Textarea } from "@appica/ui-react/textarea";
import { useState } from "react";
import type { InstitutionTicket, TicketUpdate } from "@/api/institution/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";

type NextStatus = TicketUpdate["status"];

const NEXT: Record<InstitutionTicket["status"], { status: NextStatus; label: MessageKey; needsNote: boolean }[]> = {
  created: [
    { status: "acknowledged", label: "inbox.acknowledge", needsNote: false },
    { status: "rejected", label: "common.reject", needsNote: true },
  ],
  acknowledged: [
    { status: "in_progress", label: "inbox.start", needsNote: false },
    { status: "rejected", label: "common.reject", needsNote: true },
  ],
  in_progress: [{ status: "resolved", label: "inbox.reportResolved", needsNote: true }],
  resolved: [],
  rejected: [],
};

const NOTE_HINT: Partial<Record<InstitutionTicket["status"], MessageKey>> = {
  created: "inbox.noteHintReject",
  acknowledged: "inbox.noteHintReject",
  in_progress: "inbox.noteHintDone",
};

type TicketStatusFormProps = {
  ticket: InstitutionTicket;
  /** Held by the inbox per ticket, so a refresh or a failed save never loses it. */
  note: string;
  onNoteChange: (note: string) => void;
  /** Resolves true when the update was saved. */
  onUpdate: (update: TicketUpdate) => Promise<boolean>;
};

/** The steps this institution may take next. The server enforces the same order. */
export function TicketStatusForm({ ticket, note, onNoteChange, onUpdate }: TicketStatusFormProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<NextStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = NEXT[ticket.status];
  const hint = NOTE_HINT[ticket.status];
  if (actions.length === 0) return null;
  const noteRelevant = actions.some((action) => action.needsNote);

  async function run(action: (typeof actions)[number]) {
    const trimmed = note.trim();
    if (action.needsNote && trimmed.length < 3) {
      setError(action.status === "resolved" ? t("inbox.sayDone") : t("inbox.sayReject"));
      return;
    }
    setError(null);
    setBusy(action.status);
    await onUpdate({ status: action.status, expected_version: ticket.version, ...(trimmed ? { note: trimmed } : {}) });
    setBusy(null);
  }

  return (
    <section aria-labelledby="ticket-next-title" className="flex flex-col gap-3">
      <h3 id="ticket-next-title" className="text-sm font-semibold text-foreground-intense">{t("inbox.next")}</h3>
      {noteRelevant && (
        <Field invalid={Boolean(error)}>
          <FieldLabel>{t("common.note")}</FieldLabel>
          <Textarea
            rows={3}
            maxLength={500}
            value={note}
            placeholder={ticket.status === "in_progress" ? t("inbox.placeholderDone") : t("inbox.placeholderOptional")}
            onChange={(event) => {
              onNoteChange(event.target.value);
              if (error) setError(null);
            }}
          />
          <FieldError match={Boolean(error)}>{error}</FieldError>
        </Field>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.status === "rejected" ? "outline" : "primary"}
            disabled={busy !== null}
            onClick={() => void run(action)}
            className={action.status === "rejected" ? "" : "flex-1"}
          >
            {busy === action.status ? t("common.saving") : t(action.label)}
          </Button>
        ))}
      </div>
      {noteRelevant && (
        <p className="text-xs text-pretty text-foreground-muted">
          {hint ? t(hint) : null}
        </p>
      )}
    </section>
  );
}

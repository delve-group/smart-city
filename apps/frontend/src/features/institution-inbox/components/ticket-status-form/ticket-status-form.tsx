import { Button } from "@appica/ui-react/button";
import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Textarea } from "@appica/ui-react/textarea";
import { useState } from "react";
import type { InstitutionTicket, TicketUpdate } from "@/api/institution/types";

type NextStatus = TicketUpdate["status"];

const NEXT: Record<InstitutionTicket["status"], { status: NextStatus; label: string; needsNote: boolean }[]> = {
  created: [
    { status: "acknowledged", label: "Acknowledge", needsNote: false },
    { status: "rejected", label: "Reject", needsNote: true },
  ],
  acknowledged: [
    { status: "in_progress", label: "Start work", needsNote: false },
    { status: "rejected", label: "Reject", needsNote: true },
  ],
  in_progress: [{ status: "resolved", label: "Report as resolved", needsNote: true }],
  resolved: [],
  rejected: [],
};

const NOTE_HINT: Partial<Record<InstitutionTicket["status"], string>> = {
  created: "A note is needed only to reject. A rejected ticket goes back to the city official; nobody else is assigned automatically.",
  acknowledged: "A note is needed only to reject. A rejected ticket goes back to the city official; nobody else is assigned automatically.",
  in_progress: "Say what was done. The city sees this note; residents see only that the problem was reported as fixed.",
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
  const [busy, setBusy] = useState<NextStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = NEXT[ticket.status];
  if (actions.length === 0) return null;
  const noteRelevant = actions.some((action) => action.needsNote);

  async function run(action: (typeof actions)[number]) {
    const trimmed = note.trim();
    if (action.needsNote && trimmed.length < 3) {
      setError(action.status === "resolved" ? "Say what was done before reporting it as resolved." : "Say why you are rejecting the ticket.");
      return;
    }
    setError(null);
    setBusy(action.status);
    await onUpdate({ status: action.status, expected_version: ticket.version, ...(trimmed ? { note: trimmed } : {}) });
    setBusy(null);
  }

  return (
    <section aria-labelledby="ticket-next-title" className="flex flex-col gap-3">
      <h3 id="ticket-next-title" className="text-sm font-semibold text-foreground-intense">Next step</h3>
      {noteRelevant && (
        <Field invalid={Boolean(error)}>
          <FieldLabel>Note</FieldLabel>
          <Textarea
            rows={3}
            maxLength={500}
            value={note}
            placeholder={ticket.status === "in_progress" ? "Feeder repaired, supply restored…" : "Optional, unless you reject the ticket"}
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
            {busy === action.status ? "Saving…" : action.label}
          </Button>
        ))}
      </div>
      {noteRelevant && (
        <p className="text-xs text-pretty text-foreground-muted">
          {NOTE_HINT[ticket.status]}
        </p>
      )}
    </section>
  );
}

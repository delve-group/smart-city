import { Check, X } from "@appica/icons-react";
import type { Ticket } from "@/api/operations/types";
import { formatAgo, formatDateTime } from "@/shared/utils/format-time";
import { TICKET, TICKET_STEPS } from "../../utils/labels";

type TicketProgressProps = { ticket: Ticket; institutionName: string; now: number };

/** The institution's progress on the ticket, as reported by the institution. */
export function TicketProgress({ ticket, institutionName, now }: TicketProgressProps) {
  const rejected = ticket.status === "rejected";
  const current = rejected ? -1 : TICKET_STEPS.indexOf(ticket.status as (typeof TICKET_STEPS)[number]);
  const eventAt = (status: string) => ticket.events.find((event) => event.status === status);
  const steps = rejected ? ticket.events.map((event) => event.status) : TICKET_STEPS;

  return (
    <section aria-labelledby="ticket-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="ticket-title" className="text-sm font-semibold text-foreground-intense">
          {institutionName}
        </h3>
        <span className="font-mono text-xs text-foreground-muted">{ticket.reference}</span>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const event = eventAt(step);
          const isRejection = step === "rejected";
          const done = rejected ? !isRejection : index <= current;
          const active = rejected ? isRejection : index === current;
          return (
            <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
              {index < steps.length - 1 && (
                <span aria-hidden className={`absolute top-6 bottom-0 left-[0.6875rem] w-px ${index < current || rejected ? "bg-primary" : "bg-border"}`} />
              )}
              <span
                aria-hidden
                className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  isRejection
                    ? "border-error bg-error text-error-foreground"
                    : done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                }`}
              >
                {isRejection ? <X size={14} strokeWidth={3} /> : done && <Check size={14} strokeWidth={3} />}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className={`text-sm ${active ? "font-semibold text-foreground-intense" : done ? "text-foreground" : "text-foreground-muted"}`}>
                  {TICKET[step]}
                  <span className="sr-only">{active ? " (current)" : done ? " (done)" : " (pending)"}</span>
                </span>
                {event && <span className="text-xs text-foreground-muted">{formatAgo(event.at, now)}</span>}
                {event?.note && <span className="text-sm text-pretty text-foreground">“{event.note}”</span>}
                {active && ticket.expectedResolutionAt && (
                  <span className="text-sm font-medium text-foreground-intense">
                    Expected fix: {formatDateTime(ticket.expectedResolutionAt, now)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

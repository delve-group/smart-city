import { Check, Ticket as TicketIcon, X } from "@appica/icons-react";
import type { Ticket } from "@/api/operations/types";
import { useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo, formatDateTime } from "@/shared/utils/format-time";
import { TICKET_STEPS } from "../../utils/labels";
import { Fact } from "@/shared/components/fact/fact";

type TicketProgressProps = { ticket: Ticket; institutionName: string; now: number };

/** The institution's progress on the ticket, as reported by the institution. */
export function TicketProgress({ ticket, institutionName, now }: TicketProgressProps) {
  const { t, locale } = useI18n();
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
        <span className="font-mono text-xs text-foreground-muted">
          <Fact icon={TicketIcon} label={t("common.ticket")}>
            {ticket.reference}
          </Fact>
        </span>
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
                  {t(`ticket.${step}` as MessageKey)}
                  <span className="sr-only">{active ? ` (${t("common.current")})` : done ? ` (${t("common.done")})` : ` (${t("common.pending")})`}</span>
                </span>
                {event && <span className="text-xs text-foreground-muted">{formatAgo(event.at, now, locale)}</span>}
                {event?.note && <span className="text-sm text-pretty text-foreground">“{event.note}”</span>}
                {active && ticket.expectedResolutionAt && (
                  <span className="text-sm font-medium text-foreground-intense">
                    {t("report.expectedFix", { when: formatDateTime(ticket.expectedResolutionAt, now, locale) })}
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

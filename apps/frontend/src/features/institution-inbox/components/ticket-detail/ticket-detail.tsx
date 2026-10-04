import { Calendar, Clock, Id } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Separator } from "@appica/ui-react/separator";
import { useEffect, useRef } from "react";
import type { Category } from "@/api/categories/types";
import type { InstitutionTicket, TicketUpdate } from "@/api/institution/types";
import { Fact, FACTS } from "@/shared/components/fact/fact";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { PanelHeader } from "@/shared/components/panel-header/panel-header";
import { translateAssessment, translatePayloadKey, useI18n } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { formatAgo, formatDateTime } from "@/shared/utils/format-time";
import { STATUS, ticketSummary } from "../../utils/labels";
import { TicketStatusForm } from "../ticket-status-form/ticket-status-form";

type TicketDetailProps = {
  ticket: InstitutionTicket;
  now: number;
  note: string;
  onNoteChange: (note: string) => void;
  category: Category | undefined;
  onUpdate: (update: TicketUpdate) => Promise<boolean>;
  onLocate: () => void;
  onClose: () => void;
};

/** What the city asked for, what happened so far and the next allowed step. */
export function TicketDetail({ ticket, now, note, category, onNoteChange, onUpdate, onLocate, onClose }: TicketDetailProps) {
  const { t, locale } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [ticket.id]);

  return (
    <FloatingPanel labelledBy="ticket-detail-title" header={<PanelHeader category={category} onCenter={onLocate} onClose={onClose} />}>
      <ScrollArea className="min-h-0 flex-1">
        <div key={ticket.id} className="flex flex-col gap-5 px-5 pt-4 pb-6 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
          <div className="flex flex-col gap-2">
            <h2 id="ticket-detail-title" ref={headingRef} tabIndex={-1} className="outline-none text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense">
              {ticketSummary(t, ticket)}
            </h2>
            <p className="text-sm text-foreground-muted">
              {ticket.incident.locationLabel} · {t("inbox.cityIncident")} <span className="font-mono">{ticket.incident.reference}</span>
            </p>
            <p className={FACTS}>
              <Fact icon={Id} label={t("common.ticket")}>
                <span className="font-mono">{ticket.reference}</span>
              </Fact>
              <Fact icon={Clock} label={t("inbox.received")}>
                {formatAgo(ticket.createdAt, now, locale)}
              </Fact>
              {ticket.expectedResolutionAt && (
                <Fact icon={Calendar} label={t("common.expectedFix")}>
                  {formatDateTime(ticket.expectedResolutionAt, now, locale)}
                </Fact>
              )}
              <Badge variant={STATUS[ticket.status].variant} size="xs">{t(`inboxStatus.${ticket.status}` as MessageKey)}</Badge>
            </p>
          </div>

          <Separator />
          <section aria-labelledby="ticket-request-title" className="flex flex-col gap-3">
            <h3 id="ticket-request-title" className="text-sm font-semibold text-foreground-intense">{t("inbox.request")}</h3>
            <dl aria-label={t("inbox.requestLabel")} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {ticket.payload.map((line) => (
                <div key={line.key} className="col-span-2 grid grid-cols-subgrid">
                  <dt className="text-foreground-muted">{translatePayloadKey(t, line.key)}</dt>
                  <dd className="text-pretty text-foreground">{line.key === "City assessment" ? translateAssessment(t, line.value) : line.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Separator />
          <TicketStatusForm key={`${ticket.id}:${ticket.status}`} ticket={ticket} note={note} onNoteChange={onNoteChange} onUpdate={onUpdate} />
          {ticket.status === "resolved" || ticket.status === "rejected" ? (
            <p className="text-sm text-foreground-muted">
              {ticket.status === "resolved" ? t("inbox.resolvedNote") : t("inbox.rejectedNote")} {t("inbox.noMore")}
            </p>
          ) : (
            <Separator />
          )}

          <section aria-labelledby="ticket-history-title" className="flex flex-col gap-3">
            <h3 id="ticket-history-title" className="text-sm font-semibold text-foreground-intense">{t("common.history")}</h3>
            <ol className="flex flex-col gap-3">
              {ticket.events.map((event, index) => (
                <li key={`${event.status}-${index}`} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 text-foreground">
                    {t(`inboxEvent.${event.status}` as MessageKey)}
                    <span className={FACTS}>
                      <Fact icon={Clock} label={t("common.when")}>
                        {formatAgo(event.at, now, locale)}
                      </Fact>
                    </span>
                  </span>
                  {event.note && <span className="text-pretty text-foreground-muted">“{event.note}”</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ScrollArea>
    </FloatingPanel>
  );
}

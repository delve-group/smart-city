import { ArrowLeft, Calendar, Clock, Id } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Separator } from "@appica/ui-react/separator";
import type { InstitutionTicket, TicketUpdate } from "@/api/institution/types";
import { Fact, FACTS } from "@/shared/components/fact/fact";
import { formatAgo, formatDateTime } from "@/shared/utils/format-time";
import { EVENT_LABEL, STATUS } from "../../utils/labels";
import { TicketStatusForm } from "../ticket-status-form/ticket-status-form";

type TicketDetailProps = {
  ticket: InstitutionTicket;
  now: number;
  note: string;
  onNoteChange: (note: string) => void;
  onUpdate: (update: TicketUpdate) => Promise<boolean>;
  /** Phones only: back to the list. */
  onBack: () => void;
};

/** What the city asked for, what happened so far and the next allowed step. */
export function TicketDetail({ ticket, now, note, onNoteChange, onUpdate, onBack }: TicketDetailProps) {
  return (
    <article aria-labelledby="ticket-detail-title" className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <div className="md:hidden">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="start" />
          All tickets
        </Button>
      </div>
      <header className="flex flex-col gap-2">
        <h2 id="ticket-detail-title" className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground-intense">
          {ticket.incident.summary}
        </h2>
        <p className="text-sm text-foreground-muted">
          {ticket.incident.locationLabel} · city incident <span className="font-mono">{ticket.incident.reference}</span>
        </p>
        <p className={FACTS}>
          <Fact icon={Id} label="Ticket">
            <span className="font-mono">{ticket.reference}</span>
          </Fact>
          <Fact icon={Clock} label="Received">
            {formatAgo(ticket.createdAt, now)}
          </Fact>
          {ticket.expectedResolutionAt && (
            <Fact icon={Calendar} label="Expected fix">
              {formatDateTime(ticket.expectedResolutionAt, now)}
            </Fact>
          )}
          <Badge variant={STATUS[ticket.status].variant} size="xs">{STATUS[ticket.status].label}</Badge>
          <Badge variant="outline" size="xs">Demo ticket</Badge>
        </p>
      </header>

      <Separator />
      <section aria-labelledby="ticket-request-title" className="flex flex-col gap-3">
        <h3 id="ticket-request-title" className="text-sm font-semibold text-foreground-intense">Request from the city</h3>
        <dl aria-label="Approved by a city official. Resident identities and their own words are not shared." className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {ticket.payload.map((line) => (
            <div key={line.key} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-foreground-muted">{line.key}</dt>
              <dd className="text-pretty text-foreground">{line.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Separator />
      <TicketStatusForm key={`${ticket.id}:${ticket.status}`} ticket={ticket} note={note} onNoteChange={onNoteChange} onUpdate={onUpdate} />
      {ticket.status === "resolved" || ticket.status === "rejected" ? (
        <p className="text-sm text-foreground-muted">
          {ticket.status === "resolved" ? "You reported this ticket as resolved." : "You rejected this ticket; it is back with the city official."} No further steps are possible here.
        </p>
      ) : (
        <Separator />
      )}

      <section aria-labelledby="ticket-history-title" className="flex flex-col gap-3">
        <h3 id="ticket-history-title" className="text-sm font-semibold text-foreground-intense">History</h3>
        <ol className="flex flex-col gap-3">
          {ticket.events.map((event, index) => (
            <li key={`${event.status}-${index}`} className="flex flex-col gap-0.5 text-sm">
              <span className="flex flex-wrap items-center justify-between gap-x-3 text-foreground">
                {EVENT_LABEL[event.status]}
                <span className={FACTS}>
                  <Fact icon={Clock} label="When">
                    {formatAgo(event.at, now)}
                  </Fact>
                </span>
              </span>
              {event.note && <span className="text-pretty text-foreground-muted">“{event.note}”</span>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

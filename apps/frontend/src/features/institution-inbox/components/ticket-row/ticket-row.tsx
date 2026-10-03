import { Badge } from "@appica/ui-react/badge";
import type { InstitutionTicket } from "@/api/institution/types";
import { formatAgo } from "@/shared/utils/format-time";
import { STATUS } from "../../utils/labels";

type TicketRowProps = { ticket: InstitutionTicket; selected: boolean; now: number; onSelect: () => void };

/** One ticket in the inbox list. */
export function TicketRow({ ticket, selected, now, onSelect }: TicketRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-md px-3 py-3 text-left outline-none hover:bg-background-muted focus-visible:ring-2 focus-visible:ring-ring ${selected ? "bg-background-muted" : ""}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-foreground-muted">{ticket.reference}</span>
        <Badge variant={STATUS[ticket.status].variant} size="xs">{STATUS[ticket.status].label}</Badge>
      </span>
      <span className="text-sm font-medium text-pretty text-foreground-intense">{ticket.incident.summary}</span>
      <span className="text-xs text-foreground-muted">Received {formatAgo(ticket.createdAt, now)}</span>
    </button>
  );
}

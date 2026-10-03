import type { InstitutionTicket, TicketStatus } from "@/api/institution/types";
import { matchesQuery } from "@/shared/utils/normalize-text";

type BadgeVariant = "secondary" | "outline" | "success" | "warning" | "error" | "soft";

export const STATUS: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
  created: { label: "New", variant: "warning" },
  acknowledged: { label: "Acknowledged", variant: "secondary" },
  in_progress: { label: "Work started", variant: "secondary" },
  resolved: { label: "Resolved", variant: "success" },
  rejected: { label: "Rejected", variant: "soft" },
};

export const EVENT_LABEL: Record<TicketStatus, string> = {
  created: "Ticket received",
  acknowledged: "Acknowledged",
  in_progress: "Work started",
  resolved: "Reported as resolved",
  rejected: "Rejected",
};

export const isOpen = (ticket: InstitutionTicket) => ["created", "acknowledged", "in_progress"].includes(ticket.status);

/** Open tickets first, newest request on top; finished ones by latest change. */
export function sortTickets(tickets: readonly InstitutionTicket[]): { open: InstitutionTicket[]; finished: InstitutionTicket[] } {
  return {
    open: tickets.filter(isOpen).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    finished: tickets.filter((ticket) => !isOpen(ticket)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

/** Tickets in the shown categories (null: all) whose reference, place, summary or request matches every word of the query. */
export function filterTickets(
  tickets: readonly InstitutionTicket[],
  query: string,
  categoryIds: ReadonlySet<string> | null,
  categoryLabel: (categoryId: string) => string | undefined,
): InstitutionTicket[] {
  return tickets.filter(
    (ticket) =>
      (!categoryIds || categoryIds.has(ticket.incident.categoryId)) &&
      matchesQuery(
        [
          ticket.reference,
          ticket.incident.reference,
          ticket.incident.summary,
          ticket.incident.locationLabel,
          categoryLabel(ticket.incident.categoryId),
          ...ticket.payload.map((entry) => entry.value),
        ],
        query,
      ),
  );
}

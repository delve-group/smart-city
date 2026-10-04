import type { InstitutionTicket, TicketStatus } from "@/api/institution/types";
import { matchesQuery } from "@/shared/utils/normalize-text";
import type { Translator } from "@/shared/i18n/locale";
import { localizedSummary } from "@/shared/utils/incident-summary";

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
  /** The summary as shown, so a search in the chosen language finds it. */
  summaryOf: (ticket: InstitutionTicket) => string = (ticket) => ticket.incident.summary,
): InstitutionTicket[] {
  return tickets.filter(
    (ticket) =>
      (!categoryIds || categoryIds.has(ticket.incident.categoryId)) &&
      matchesQuery(
        [
          ticket.reference,
          ticket.incident.reference,
          summaryOf(ticket),
          ticket.incident.summary,
          ticket.incident.locationLabel,
          categoryLabel(ticket.incident.categoryId),
          ...ticket.payload.map((entry) => entry.value),
        ],
        query,
      ),
  );
}

/** The ticket's incident title in the chosen language, without the place (shown separately). */
export function ticketSummary(t: Translator, ticket: InstitutionTicket): string {
  const { issueType, summary, publicContent } = ticket.incident;
  return localizedSummary(t, { issueType, fallback: summary, publicContent });
}

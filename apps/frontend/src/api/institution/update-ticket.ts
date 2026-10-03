import { mapTicket } from "./mappers";
import { requestInstitution } from "./request";
import { institutionTicketDtoSchema, type InstitutionTicket, type TicketUpdate } from "./types";

/** PATCH /api/institution/tickets/:id — one step forward, against the version on screen. */
export async function updateTicket(ticketId: string, update: TicketUpdate): Promise<InstitutionTicket> {
  const dto = await requestInstitution(`/api/institution/tickets/${encodeURIComponent(ticketId)}`, institutionTicketDtoSchema, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
  return mapTicket(dto);
}

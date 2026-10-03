import { z } from "zod";
import { mapTicket } from "./mappers";
import { requestInstitution } from "./request";
import { institutionTicketDtoSchema, type InstitutionTicket } from "./types";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockTickets } from "../mocks/institution-store";

const pageSchema = z.object({ items: z.array(institutionTicketDtoSchema), next_cursor: z.string().nullable() });

/** GET /api/institution/tickets — tickets assigned to the signed-in institution, latest change first. */
export async function getTickets(signal?: AbortSignal): Promise<InstitutionTicket[]> {
  if (USE_MOCKS) return fromMock(() => mockTickets().map(mapTicket));
  const page = await requestInstitution("/api/institution/tickets?limit=100", pageSchema, { signal });
  return page.items.map(mapTicket);
}

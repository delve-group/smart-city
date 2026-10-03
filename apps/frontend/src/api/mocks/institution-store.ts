import type { InstitutionProfile, InstitutionTicketDto, TicketUpdate } from "../institution/types";
import { InstitutionApiError } from "../institution/types";
import type { IncidentDto, TicketDto } from "../operations/types";
import { log, mockWorkspace, mutate, nowIso } from "./operations-store";
import { INSTITUTIONS } from "./operations-seed";

/**
 * MOCK inbox for `npm run dev:ui`, signed in as the Electricity Operator demo account. Tickets
 * are the ones in the mock operations store, so approving a proposal on /operations shows up here.
 */
const INSTITUTION_ID = "demo-electricity";

const NEXT: Record<TicketDto["status"], TicketDto["status"][]> = {
  created: ["acknowledged", "rejected"],
  acknowledged: ["in_progress", "rejected"],
  in_progress: ["resolved"],
  resolved: [],
  rejected: [],
};

export function mockProfile(): InstitutionProfile {
  const institution = INSTITUTIONS.find((candidate) => candidate.id === INSTITUTION_ID)!;
  return { id: institution.id, name: institution.name, isDemo: true };
}

function toDto(incident: IncidentDto, ticket: TicketDto): InstitutionTicketDto {
  const events = ticket.events;
  const last = events.at(-1);
  return {
    id: ticket.id,
    reference: ticket.reference,
    institution_id: ticket.institution_id,
    status: ticket.status,
    version: ticket.version ?? 1,
    payload: incident.proposal?.payload ?? [],
    incident: {
      id: incident.id,
      reference: incident.reference,
      category_id: incident.category_id,
      issue_type: incident.issue_type,
      public_summary: incident.title,
      public_location: { lat: incident.lat, lng: incident.lng, label: incident.address, precision: "street" },
    },
    expected_resolution_at: ticket.expected_resolution_at,
    result_note: ticket.status === "resolved" || ticket.status === "rejected" ? (last?.note ?? null) : null,
    events,
    created_at: events[0]?.at ?? incident.updated_at,
    updated_at: last?.at ?? incident.updated_at,
    provenance: "demo",
  };
}

export function mockTickets(): InstitutionTicketDto[] {
  return mockWorkspace()
    .incidents.flatMap((incident) => (incident.ticket?.institution_id === INSTITUTION_ID ? [toDto(incident, incident.ticket)] : []))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function updateMockTicket(ticketId: string, update: TicketUpdate): InstitutionTicketDto {
  let result: InstitutionTicketDto | null = null;
  mutate((state) => {
    const incident = state.incidents.find((candidate) => candidate.ticket?.id === ticketId && candidate.ticket.institution_id === INSTITUTION_ID);
    const ticket = incident?.ticket;
    if (!incident || !ticket) throw new InstitutionApiError(404, "not_found", "This ticket does not exist or is not assigned to your institution.");
    if ((ticket.version ?? 1) !== update.expected_version) {
      throw new InstitutionApiError(409, "version_conflict", "This ticket changed while you were looking at it. Check the latest version.");
    }
    if (!NEXT[ticket.status].includes(update.status)) {
      throw new InstitutionApiError(409, "invalid_transition", "This ticket cannot move to that step.");
    }

    ticket.status = update.status;
    ticket.version = (ticket.version ?? 1) + 1;
    ticket.events.push({ status: update.status, at: nowIso(), note: update.note ?? null });
    if (update.expected_resolution_at !== undefined) ticket.expected_resolution_at = update.expected_resolution_at;

    const name = mockProfile().name;
    if (update.status === "in_progress") incident.response_status = "in_progress";
    if (update.status === "resolved") incident.response_status = "resolved";
    if (update.status === "rejected") {
      incident.response_status = "triaged";
      incident.review = { reason: "ticket_rejected", note: `${name}: “${update.note ?? "Rejected without a note."}”`, since: nowIso() };
    }
    incident.version += 1;
    const action = { acknowledged: "Acknowledged ticket", in_progress: "Started work", resolved: "Resolved ticket", rejected: "Rejected ticket" }[update.status];
    log(state, incident, name, action, update.note ?? null);
    result = toDto(incident, ticket);
  });
  return result!;
}

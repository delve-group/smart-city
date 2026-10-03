import type { InstitutionTicket, InstitutionTicketDto } from "./types";

export function mapTicket(dto: InstitutionTicketDto): InstitutionTicket {
  return {
    id: dto.id,
    reference: dto.reference,
    status: dto.status,
    version: dto.version,
    payload: dto.payload,
    incident: {
      id: dto.incident.id,
      reference: dto.incident.reference,
      categoryId: dto.incident.category_id,
      summary: dto.incident.public_summary,
      locationLabel: dto.incident.public_location.label,
    },
    expectedResolutionAt: dto.expected_resolution_at,
    resultNote: dto.result_note,
    events: dto.events,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

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
      issueType: dto.incident.issue_type,
      precision: dto.incident.public_location.precision,
      locationLabel: dto.incident.public_location.label,
      location: { lat: dto.incident.public_location.lat, lng: dto.incident.public_location.lng },
    },
    expectedResolutionAt: dto.expected_resolution_at,
    resultNote: dto.result_note,
    events: dto.events,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

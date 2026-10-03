import type {
  EvidenceDto,
  IncidentDto,
  Incident,
  OperationsReport,
  OperationsReportDto,
  Proposal,
  ProposalDto,
  Ticket,
  TicketDto,
  Workspace,
  WorkspaceDto,
} from "./types";

function mapProposal(dto: ProposalDto): Proposal {
  return {
    id: dto.id,
    version: dto.version,
    incidentVersion: dto.incident_version,
    institutionId: dto.institution_id,
    action: dto.action,
    payload: dto.payload,
    evidenceIds: dto.evidence_ids,
    explanation: dto.explanation,
    state: dto.state,
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    decidedBy: dto.decided_by,
    decidedAt: dto.decided_at,
    reason: dto.reason,
    executionError: dto.execution_error ?? null,
  };
}

function mapTicket(dto: TicketDto): Ticket {
  return {
    id: dto.id,
    reference: dto.reference,
    institutionId: dto.institution_id,
    status: dto.status,
    version: dto.version ?? 1,
    expectedResolutionAt: dto.expected_resolution_at,
    events: dto.events,
  };
}

function mapEvidence(dto: EvidenceDto) {
  return {
    id: dto.id,
    kind: dto.kind,
    label: dto.label,
    source: dto.source,
    observedAt: dto.observed_at,
    retrievedAt: dto.retrieved_at,
    provenance: dto.provenance,
    state: dto.state,
    note: dto.note,
  };
}

function mapIncident(dto: IncidentDto): Incident {
  return {
    id: dto.id,
    reference: dto.reference,
    categoryId: dto.category_id,
    issueType: dto.issue_type,
    title: dto.title,
    location: { lat: dto.lat, lng: dto.lng },
    address: dto.address,
    district: dto.district,
    matchingRadiusM: dto.matching_radius_m,
    assessment: dto.assessment,
    responseStatus: dto.response_status,
    version: dto.version,
    supportCount: dto.support_count,
    urgent: dto.urgent,
    review: dto.review,
    reportIds: dto.report_ids,
    evidence: dto.evidence.map(mapEvidence),
    proposal: dto.proposal ? mapProposal(dto.proposal) : null,
    ticket: dto.ticket ? mapTicket(dto.ticket) : null,
    history: dto.history,
    updatedAt: dto.updated_at,
  };
}

function mapReport(dto: OperationsReportDto): OperationsReport {
  return {
    id: dto.id,
    reference: dto.reference,
    channel: dto.channel,
    categoryId: dto.category_id,
    issueType: dto.issue_type ?? null,
    scope: dto.scope ?? "unknown",
    urgent: dto.urgent ?? false,
    summary: dto.summary,
    observedAt: dto.observed_at,
    submittedAt: dto.submitted_at,
    location: { lat: dto.lat, lng: dto.lng },
    address: dto.address,
    unit: dto.unit,
    triageState: dto.triage_state,
    incidentId: dto.incident_id,
    version: dto.version,
    review: dto.review && {
      reason: dto.review.reason,
      note: dto.review.note,
      since: dto.review.since,
      candidates: dto.review.candidates.map((candidate) => ({
        incidentId: candidate.incident_id,
        distanceM: candidate.distance_m,
        minutesApart: candidate.minutes_apart,
      })),
    },
  };
}

export function mapWorkspace(dto: WorkspaceDto): Workspace {
  return {
    source: dto.source,
    generatedAt: dto.generated_at,
    institutions: dto.institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      categoryIds: institution.category_ids,
      isDemo: institution.is_demo,
    })),
    incidents: dto.incidents.map(mapIncident),
    reports: dto.reports.map(mapReport),
  };
}

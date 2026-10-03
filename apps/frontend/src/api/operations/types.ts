import { z } from "zod";

/*
 * Staff workspace contract (official side). Demo: served from an in-memory store until the
 * persistent incident slice exists. Shapes follow specs/001-voice-incident-response.
 */

export const ASSESSMENTS = ["suspected", "corroborated", "verified", "disputed"] as const;
export type Assessment = (typeof ASSESSMENTS)[number];

export const RESPONSE_STATUSES = ["new", "triaged", "assigned", "in_progress", "resolved", "closed"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const PROPOSAL_STATES = ["pending", "approved", "rejected", "executing", "executed", "failed", "unknown", "superseded"] as const;
export type ProposalState = (typeof PROPOSAL_STATES)[number];

export const TICKET_STATUSES = ["created", "acknowledged", "in_progress", "resolved", "rejected"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TRIAGE_STATES = ["pending", "linked", "needs_review", "private_issue", "out_of_scope"] as const;
export type TriageState = (typeof TRIAGE_STATES)[number];

/** Why a record sits in the official's review queue. */
export const REVIEW_REASONS = [
  "urgent",
  "proposal_ready",
  "needs_responsibility",
  "ticket_rejected",
  "needs_link",
  "private_scope",
  "pending_triage",
] as const;
export type ReviewReason = (typeof REVIEW_REASONS)[number];

const isoDate = z.iso.datetime({ offset: true });

const reviewDtoSchema = z.object({
  reason: z.enum(REVIEW_REASONS),
  note: z.string(),
  since: isoDate,
});

const institutionDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category_ids: z.array(z.string()),
  is_demo: z.boolean(),
});

const reportDtoSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  channel: z.enum(["voice", "form"]),
  category_id: z.string().min(1),
  /** English operator summary; the original narrative stays restricted. */
  summary: z.string(),
  observed_at: isoDate.nullable(),
  submitted_at: isoDate,
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  /** Flat or unit detail. Staff only; never published. */
  unit: z.string().nullable(),
  triage_state: z.enum(TRIAGE_STATES),
  incident_id: z.string().nullable(),
  version: z.number().int().positive(),
  review: reviewDtoSchema
    .extend({
      candidates: z.array(z.object({ incident_id: z.string(), distance_m: z.number(), minutes_apart: z.number() })),
    })
    .nullable(),
});

const evidenceDtoSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["report", "observation"]),
  label: z.string(),
  source: z.string(),
  observed_at: isoDate.nullable(),
  retrieved_at: isoDate,
  provenance: z.enum(["demo", "live"]),
  state: z.enum(["current", "stale", "missing", "contradictory"]),
  note: z.string().nullable(),
});

const proposalDtoSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  incident_version: z.number().int().positive(),
  institution_id: z.string(),
  action: z.literal("create_service_ticket"),
  /** Exactly what the institution receives. Immutable once created. */
  payload: z.array(z.object({ key: z.string(), value: z.string() })),
  evidence_ids: z.array(z.string()),
  explanation: z.string(),
  state: z.enum(PROPOSAL_STATES),
  created_by: z.string(),
  created_at: isoDate,
  decided_by: z.string().nullable(),
  decided_at: isoDate.nullable(),
  reason: z.string().nullable(),
});

const ticketDtoSchema = z.object({
  id: z.string().min(1),
  reference: z.string(),
  institution_id: z.string(),
  status: z.enum(TICKET_STATUSES),
  expected_resolution_at: isoDate.nullable(),
  events: z.array(z.object({ status: z.enum(TICKET_STATUSES), at: isoDate, note: z.string().nullable() })),
});

const historyDtoSchema = z.object({
  id: z.string(),
  at: isoDate,
  actor: z.string(),
  action: z.string(),
  detail: z.string().nullable(),
});

const incidentDtoSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  category_id: z.string().min(1),
  issue_type: z.string(),
  title: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  district: z.string().nullable(),
  matching_radius_m: z.number().positive(),
  assessment: z.enum(ASSESSMENTS),
  response_status: z.enum(RESPONSE_STATUSES),
  version: z.number().int().positive(),
  /** Distinct residents: reporters plus "affected too", each counted once. Demo, unverified. */
  support_count: z.number().int().nonnegative(),
  urgent: z.boolean(),
  review: reviewDtoSchema.nullable(),
  report_ids: z.array(z.string()),
  evidence: z.array(evidenceDtoSchema),
  proposal: proposalDtoSchema.nullable(),
  ticket: ticketDtoSchema.nullable(),
  history: z.array(historyDtoSchema),
  updated_at: isoDate,
});

export const workspaceDtoSchema = z.object({
  source: z.string(),
  generated_at: isoDate,
  institutions: z.array(institutionDtoSchema),
  incidents: z.array(incidentDtoSchema),
  reports: z.array(reportDtoSchema),
});

export type WorkspaceDto = z.infer<typeof workspaceDtoSchema>;
export type IncidentDto = z.infer<typeof incidentDtoSchema>;
export type OperationsReportDto = z.infer<typeof reportDtoSchema>;
export type ProposalDto = z.infer<typeof proposalDtoSchema>;
export type TicketDto = z.infer<typeof ticketDtoSchema>;
export type InstitutionDto = z.infer<typeof institutionDtoSchema>;
export type HistoryDto = z.infer<typeof historyDtoSchema>;
export type EvidenceDto = z.infer<typeof evidenceDtoSchema>;

/* Commands. Every write names the version the official was looking at. */

/** Body of POST /api/action-proposals/{id}/decision, as in docs/api-contract.md. */
export const proposalDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approved"),
    expected_proposal_version: z.number().int().positive(),
    expected_incident_version: z.number().int().positive(),
  }),
  z.object({
    decision: z.literal("rejected"),
    expected_proposal_version: z.number().int().positive(),
    expected_incident_version: z.number().int().positive(),
    reason: z.string().trim().min(3, "Say why, in a few words."),
  }),
]);
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;

const reason = z.string().trim().min(3, "Say why, in a few words.").max(500);

export const incidentCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choose_institution"), expected_version: z.number().int(), institution_id: z.string().min(1) }),
  z.object({ type: z.literal("verify"), expected_version: z.number().int(), reason }),
  z.object({ type: z.literal("dispute"), expected_version: z.number().int(), reason }),
  z.object({ type: z.literal("close"), expected_version: z.number().int() }),
  z.object({ type: z.literal("reopen"), expected_version: z.number().int(), reason }),
]);
export type IncidentCommand = z.infer<typeof incidentCommandSchema>;

export const reportTriageSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("link"), expected_version: z.number().int(), incident_id: z.string().min(1) }),
  z.object({ decision: z.literal("new_incident"), expected_version: z.number().int() }),
  z.object({ decision: z.literal("private_issue"), expected_version: z.number().int(), reason }),
  z.object({ decision: z.literal("out_of_scope"), expected_version: z.number().int(), reason }),
]);
export type ReportTriage = z.infer<typeof reportTriageSchema>;

/* App model. */

export type Institution = { id: string; name: string; categoryIds: string[]; isDemo: boolean };

export type Review = { reason: ReviewReason; note: string; since: string };

export type ReportCandidate = { incidentId: string; distanceM: number; minutesApart: number };

export type OperationsReport = {
  id: string;
  reference: string;
  channel: "voice" | "form";
  categoryId: string;
  summary: string;
  observedAt: string | null;
  submittedAt: string;
  location: { lat: number; lng: number };
  address: string;
  unit: string | null;
  triageState: TriageState;
  incidentId: string | null;
  version: number;
  review: (Review & { candidates: ReportCandidate[] }) | null;
};

export type Evidence = {
  id: string;
  kind: "report" | "observation";
  label: string;
  source: string;
  observedAt: string | null;
  retrievedAt: string;
  provenance: "demo" | "live";
  state: "current" | "stale" | "missing" | "contradictory";
  note: string | null;
};

export type Proposal = {
  id: string;
  version: number;
  incidentVersion: number;
  institutionId: string;
  action: "create_service_ticket";
  payload: { key: string; value: string }[];
  evidenceIds: string[];
  explanation: string;
  state: ProposalState;
  createdBy: string;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  reason: string | null;
};

export type Ticket = {
  id: string;
  reference: string;
  institutionId: string;
  status: TicketStatus;
  expectedResolutionAt: string | null;
  events: { status: TicketStatus; at: string; note: string | null }[];
};

export type HistoryEvent = { id: string; at: string; actor: string; action: string; detail: string | null };

export type Incident = {
  id: string;
  reference: string;
  categoryId: string;
  issueType: string;
  title: string;
  location: { lat: number; lng: number };
  address: string;
  district: string | null;
  matchingRadiusM: number;
  assessment: Assessment;
  responseStatus: ResponseStatus;
  version: number;
  supportCount: number;
  urgent: boolean;
  review: Review | null;
  reportIds: string[];
  evidence: Evidence[];
  proposal: Proposal | null;
  ticket: Ticket | null;
  history: HistoryEvent[];
  updatedAt: string;
};

export type Workspace = {
  source: string;
  generatedAt: string;
  institutions: Institution[];
  incidents: Incident[];
  reports: OperationsReport[];
};

/** A failed staff request, with the API's machine-readable code (e.g. `version_conflict`). */
export class OperationsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

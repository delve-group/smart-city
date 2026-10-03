import type {
  IncidentCommand,
  IncidentDto,
  OperationsReportDto,
  ProposalDecision,
  ProposalDto,
  ReportTriage,
  WorkspaceDto,
} from "@/api/operations/types";
import { ApiError } from "@/server/http/api";
import { AGENT, createSeedWorkspace, INSTITUTIONS, OFFICIAL } from "./mock-operations";

/**
 * DEMO STORE: in-memory incidents for the official workspace. Changes live until the server
 * restarts and are not shared between instances. Follows the spec's rules (versions, one
 * ticket per approved proposal, no ticket on rejection) so the UI can be built against them.
 * There is no staff session check yet; the persistent slice must add it.
 */
let state: ReturnType<typeof createSeedWorkspace> | null = null;
let nextIncident = 146;
let nextTicket = 420;
let nextHistory = 1000;

function data() {
  state ??= createSeedWorkspace();
  return state;
}

export function snapshot(): WorkspaceDto {
  return { source: "demo", generated_at: new Date().toISOString(), ...structuredClone(data()) };
}

function nowIso() {
  return new Date().toISOString();
}

function log(incident: IncidentDto, actor: string, action: string, detail: string | null = null) {
  incident.history.push({ id: `H-${++nextHistory}`, at: nowIso(), actor, action, detail });
  incident.updated_at = nowIso();
}

function findIncident(id: string): IncidentDto {
  const incident = data().incidents.find((candidate) => candidate.id === id);
  if (!incident) throw new ApiError(404, "not_found", "This incident no longer exists.");
  return incident;
}

function findReport(id: string): OperationsReportDto {
  const report = data().reports.find((candidate) => candidate.id === id);
  if (!report) throw new ApiError(404, "not_found", "This report no longer exists.");
  return report;
}

function expectVersion(actual: number, expected: number) {
  if (actual !== expected) {
    throw new ApiError(409, "version_conflict", "Someone changed this while you were reviewing it. Check the latest version.");
  }
}

function institutionName(id: string) {
  return INSTITUTIONS.find((institution) => institution.id === id)?.name ?? id;
}

const ACTIVE = new Set(["new", "triaged", "assigned", "in_progress"]);

/** The payload a proposal would send, built from the incident's current facts. */
function proposalFor(incident: IncidentDto, institutionId: string, createdBy: string, explanation: string): ProposalDto {
  const reports = data().reports.filter((report) => incident.report_ids.includes(report.id));
  const evidenceIds = incident.evidence.filter((item) => item.state !== "missing").map((item) => item.id);
  return {
    id: `prop-${crypto.randomUUID().slice(0, 8)}`,
    version: (incident.proposal?.version ?? 0) + 1,
    incident_version: incident.version,
    institution_id: institutionId,
    action: "create_service_ticket",
    payload: [
      { key: "Issue", value: incident.title },
      { key: "Area", value: [incident.address, incident.district].filter(Boolean).join(", ") },
      { key: "Residents reporting", value: `${reports.length} (unverified)` },
      { key: "Evidence", value: evidenceIds.join(", ") },
    ],
    evidence_ids: evidenceIds,
    explanation,
    state: "pending",
    created_by: createdBy,
    created_at: nowIso(),
    decided_by: null,
    decided_at: null,
    reason: null,
  };
}

/** A material change makes an unexecuted proposal stale; the agent prepares a fresh one. */
function supersedeProposal(incident: IncidentDto) {
  const proposal = incident.proposal;
  if (!proposal || (proposal.state !== "pending" && proposal.state !== "approved")) return;
  proposal.state = "superseded";
  incident.proposal = proposalFor(
    incident,
    proposal.institution_id,
    AGENT,
    `Updated after the evidence changed. Replaces proposal v${proposal.version}.`,
  );
  log(incident, AGENT, `Proposed ticket v${incident.proposal.version}`, `Replaces v${proposal.version}`);
}

export function decideProposal(proposalId: string, decision: ProposalDecision) {
  const incident = data().incidents.find((candidate) => candidate.proposal?.id === proposalId);
  const proposal = incident?.proposal;
  if (!incident || !proposal) throw new ApiError(404, "not_found", "This proposal no longer exists.");

  // Repeating an approval returns the original result instead of creating a second ticket.
  if (decision.decision === "approved" && proposal.state === "executed") return snapshot();
  if (proposal.state !== "pending") {
    throw new ApiError(409, "proposal_closed", "This proposal has already been decided or replaced.");
  }
  expectVersion(proposal.version, decision.expected_proposal_version);
  expectVersion(proposal.incident_version, decision.expected_incident_version);
  expectVersion(incident.version, decision.expected_incident_version);

  proposal.decided_by = OFFICIAL;
  proposal.decided_at = nowIso();

  if (decision.decision === "rejected") {
    proposal.state = "rejected";
    proposal.reason = decision.reason;
    incident.review = { reason: "needs_responsibility", note: `Proposal rejected: ${decision.reason}`, since: nowIso() };
    log(incident, OFFICIAL, `Rejected proposal v${proposal.version}`, decision.reason);
    return snapshot();
  }

  // Demo executor: the institution connector always succeeds immediately.
  proposal.state = "executed";
  const prefix = proposal.institution_id === "demo-water" ? "WAT" : "ELE";
  incident.ticket = {
    id: `tkt-${crypto.randomUUID().slice(0, 8)}`,
    reference: `${prefix}-26-0${nextTicket++}`,
    institution_id: proposal.institution_id,
    status: "created",
    expected_resolution_at: null,
    events: [{ status: "created", at: nowIso(), note: null }],
  };
  incident.response_status = "assigned";
  incident.review = null;
  incident.version += 1;
  log(incident, OFFICIAL, `Approved proposal v${proposal.version}`, institutionName(proposal.institution_id));
  log(incident, "Executor", `Created ticket ${incident.ticket.reference}`);
  return snapshot();
}

export function runIncidentCommand(incidentId: string, command: IncidentCommand) {
  const incident = findIncident(incidentId);
  expectVersion(incident.version, command.expected_version);

  switch (command.type) {
    case "choose_institution": {
      const institution = INSTITUTIONS.find((candidate) => candidate.id === command.institution_id);
      if (!institution) throw new ApiError(400, "invalid_request", "Unknown institution.");
      const ticketActive = incident.ticket && !["resolved", "rejected"].includes(incident.ticket.status);
      if (ticketActive || !ACTIVE.has(incident.response_status)) {
        throw new ApiError(409, "invalid_state", "This incident already has active work or is finished.");
      }
      if (incident.proposal?.state === "pending") incident.proposal.state = "superseded";
      incident.version += 1;
      incident.response_status = "triaged";
      incident.proposal = proposalFor(incident, institution.id, OFFICIAL, `${institution.name} chosen by the official.`);
      incident.review = { reason: "proposal_ready", note: `Ticket for ${institution.name} is ready for approval.`, since: nowIso() };
      log(incident, OFFICIAL, "Chose responsible institution", institution.name);
      log(incident, OFFICIAL, `Prepared proposal v${incident.proposal.version}`);
      break;
    }
    case "verify":
    case "dispute":
      incident.assessment = command.type === "verify" ? "verified" : "disputed";
      incident.version += 1;
      log(incident, OFFICIAL, command.type === "verify" ? "Verified" : "Disputed", command.reason);
      break;
    case "close":
      if (incident.response_status !== "resolved") throw new ApiError(409, "invalid_state", "Only a resolved incident can be closed.");
      incident.response_status = "closed";
      incident.version += 1;
      log(incident, OFFICIAL, "Closed");
      break;
    case "reopen":
      if (incident.response_status !== "resolved" && incident.response_status !== "closed") {
        throw new ApiError(409, "invalid_state", "Only a resolved or closed incident can be reopened.");
      }
      incident.response_status = "triaged";
      incident.version += 1;
      incident.review = { reason: "needs_responsibility", note: `Reopened: ${command.reason}`, since: nowIso() };
      log(incident, OFFICIAL, "Reopened", command.reason);
      break;
  }
  return snapshot();
}

export function triageReport(reportId: string, triage: ReportTriage) {
  const report = findReport(reportId);
  expectVersion(report.version, triage.expected_version);
  if (report.incident_id) throw new ApiError(409, "invalid_state", "This report is already linked.");

  switch (triage.decision) {
    case "link": {
      const incident = findIncident(triage.incident_id);
      if (!ACTIVE.has(incident.response_status)) {
        throw new ApiError(409, "invalid_state", "This incident is finished. Start a new incident instead.");
      }
      incident.report_ids.push(report.id);
      incident.support_count += 1;
      incident.evidence.push({
        id: report.reference,
        kind: "report",
        label: `${report.reference} · ${report.channel === "voice" ? "Voice" : "Form"} report`,
        source: "Resident report",
        observed_at: report.observed_at,
        retrieved_at: nowIso(),
        provenance: "demo",
        state: "current",
        note: null,
      });
      incident.version += 1;
      log(incident, OFFICIAL, `Linked ${report.reference}`, "Manual link");
      supersedeProposal(incident);
      report.incident_id = incident.id;
      report.triage_state = "linked";
      break;
    }
    case "new_incident": {
      const reference = `INC-0${nextIncident++}`;
      const incident: IncidentDto = {
        id: reference.toLowerCase(),
        reference,
        category_id: report.category_id,
        issue_type: "unclassified",
        title: report.summary.length > 60 ? `${report.summary.slice(0, 57)}…` : report.summary,
        lat: report.lat,
        lng: report.lng,
        address: report.address,
        district: null,
        matching_radius_m: 300,
        assessment: "suspected",
        response_status: "triaged",
        version: 1,
        support_count: 1,
        urgent: false,
        review: { reason: "needs_responsibility", note: "New incident from a manual review. Choose who should respond.", since: nowIso() },
        report_ids: [report.id],
        evidence: [],
        proposal: null,
        ticket: null,
        history: [],
        updated_at: nowIso(),
      };
      log(incident, OFFICIAL, "Created incident", `From ${report.reference}`);
      data().incidents.unshift(incident);
      report.incident_id = incident.id;
      report.triage_state = "linked";
      break;
    }
    case "private_issue":
    case "out_of_scope":
      report.triage_state = triage.decision;
      break;
  }
  report.review = null;
  report.version += 1;
  return snapshot();
}

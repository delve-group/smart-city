import type {
  IncidentCommand,
  IncidentDto,
  OperationsReportDto,
  ProposalDecision,
  ProposalDto,
  Reconciliation,
  ReportTriage,
  TicketDto,
  WorkspaceDto,
} from "../operations/types";
import { OperationsApiError } from "../operations/types";
import { AGENT, createSeedWorkspace, EXECUTOR, INSTITUTIONS, OFFICIAL, TICKET_PREFIX } from "./operations-seed";

/**
 * MOCK STORE for `npm run dev:ui`: incidents, reports and tickets kept in the browser. It follows
 * the same rules as the server (versions, one ticket per approval, no ticket on rejection) and is
 * saved to localStorage so /operations and /institution share it across tabs and reloads.
 */

type State = Omit<WorkspaceDto, "source" | "generated_at"> & { counters: { incident: number; ticket: number; history: number } };

const STORAGE_KEY = "mradar-mock-operations-v2";
let memory: State | null = null;

function load(): State {
  if (memory) return memory;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return (memory = JSON.parse(saved) as State);
  } catch {
    // Storage blocked or corrupt: start from the seed.
  }
  memory = { ...createSeedWorkspace(), counters: { incident: 151, ticket: 420, history: 1000 } };
  save();
  return memory;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Keep working in memory only.
  }
}

/** Another tab changed the mock data; read it again on the next request. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) memory = null;
  });
}

export function mockWorkspace(): WorkspaceDto {
  const { institutions, incidents, reports } = load();
  return { source: "demo", generated_at: nowIso(), ...structuredClone({ institutions, incidents, reports }) };
}

/** Run a change against the stored data, save it and return the new workspace. */
export function mutate(change: (state: State) => void): WorkspaceDto {
  memory = null;
  const state = load();
  change(state);
  save();
  return mockWorkspace();
}

export function nowIso() {
  return new Date().toISOString();
}

export function log(state: State, incident: IncidentDto, actor: string, action: string, detail: string | null = null) {
  incident.history.push({ id: `H-${++state.counters.history}`, at: nowIso(), actor, action, detail });
  incident.updated_at = nowIso();
}

function findIncident(state: State, id: string): IncidentDto {
  const incident = state.incidents.find((candidate) => candidate.id === id);
  if (!incident) throw new OperationsApiError(404, "not_found", "This incident no longer exists.");
  return incident;
}

function findReport(state: State, id: string): OperationsReportDto {
  const report = state.reports.find((candidate) => candidate.id === id);
  if (!report) throw new OperationsApiError(404, "not_found", "This report no longer exists.");
  return report;
}

function expectVersion(actual: number, expected: number) {
  if (actual !== expected) {
    throw new OperationsApiError(409, "version_conflict", "Someone changed this while you were reviewing it. Check the latest version.");
  }
}

export function institutionName(id: string) {
  return INSTITUTIONS.find((institution) => institution.id === id)?.name ?? id;
}

const ACTIVE = new Set(["new", "triaged", "assigned", "in_progress"]);

function proposalFor(state: State, incident: IncidentDto, institutionId: string, createdBy: string, explanation: string): ProposalDto {
  const reports = state.reports.filter((report) => incident.report_ids.includes(report.id));
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
      { key: "Residents reporting", value: String(reports.length) },
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
function supersedeProposal(state: State, incident: IncidentDto) {
  const proposal = incident.proposal;
  if (!proposal || (proposal.state !== "pending" && proposal.state !== "approved")) return;
  proposal.state = "superseded";
  incident.proposal = proposalFor(state, incident, proposal.institution_id, AGENT, `Zaktualizowano po zmianie dowodów. Zastępuje propozycję v${proposal.version}.`);
  log(state, incident, AGENT, `Zaproponowano zlecenie v${incident.proposal.version}`, `Zastępuje v${proposal.version}`);
}

export function decideProposal(proposalId: string, decision: ProposalDecision): WorkspaceDto {
  return mutate((state) => {
    const incident = state.incidents.find((candidate) => candidate.proposal?.id === proposalId);
    const proposal = incident?.proposal;
    if (!incident || !proposal) throw new OperationsApiError(404, "not_found", "This proposal no longer exists.");

    // Repeating an approval returns the original result instead of creating a second ticket.
    if (decision.decision === "approved" && proposal.state === "executed") return;
    if (proposal.state !== "pending") throw new OperationsApiError(409, "proposal_closed", "This proposal has already been decided or replaced.");
    expectVersion(proposal.version, decision.expected_proposal_version);
    expectVersion(incident.version, decision.expected_incident_version);

    proposal.decided_by = OFFICIAL;
    proposal.decided_at = nowIso();

    if (decision.decision === "rejected") {
      proposal.state = "rejected";
      proposal.reason = decision.reason;
      incident.review = { reason: "needs_responsibility", note: `Propozycja odrzucona: ${decision.reason}`, since: nowIso() };
      incident.version += 1;
      log(state, incident, OFFICIAL, `Odrzucono propozycję v${proposal.version}`, decision.reason);
      return;
    }

    // Mock executor: the institution always receives the ticket immediately.
    proposal.state = "executed";
    const ticket: TicketDto = {
      id: `tkt-${crypto.randomUUID().slice(0, 8)}`,
      reference: `${TICKET_PREFIX[proposal.institution_id] ?? "ZLE"}-26-0${state.counters.ticket++}`,
      institution_id: proposal.institution_id,
      status: "created",
      version: 1,
      expected_resolution_at: null,
      events: [{ status: "created", at: nowIso(), note: null }],
    };
    incident.ticket = ticket;
    incident.response_status = "assigned";
    incident.review = null;
    incident.version += 1;
    log(state, incident, OFFICIAL, `Zatwierdzono propozycję v${proposal.version}`, institutionName(proposal.institution_id));
    log(state, incident, EXECUTOR, `Utworzono zlecenie ${ticket.reference}`);
  });
}

export function reconcileProposal(proposalId: string, input: Reconciliation): WorkspaceDto {
  return mutate((state) => {
    const incident = state.incidents.find((candidate) => candidate.proposal?.id === proposalId);
    const proposal = incident?.proposal;
    if (!incident || !proposal) throw new OperationsApiError(404, "not_found", "This proposal no longer exists.");
    expectVersion(proposal.version, input.expected_proposal_version);
    if (proposal.state !== "unknown" && proposal.state !== "failed") {
      throw new OperationsApiError(409, "invalid_state", "There is nothing to look up for this proposal.");
    }
    proposal.state = "executed";
    proposal.execution_error = null;
    log(state, incident, OFFICIAL, "Sprawdzono wynik wysyłki", input.reason);
  });
}

export function runIncidentCommand(incidentId: string, command: IncidentCommand): WorkspaceDto {
  return mutate((state) => {
    const incident = findIncident(state, incidentId);
    expectVersion(incident.version, command.expected_version);

    switch (command.type) {
      case "choose_institution": {
        const institution = INSTITUTIONS.find((candidate) => candidate.id === command.institution_id);
        if (!institution) throw new OperationsApiError(400, "invalid_request", "Unknown institution.");
        const ticketActive = incident.ticket && !["resolved", "rejected"].includes(incident.ticket.status);
        if (ticketActive || !ACTIVE.has(incident.response_status)) {
          throw new OperationsApiError(409, "invalid_state", "This incident already has active work or is finished.");
        }
        if (incident.proposal?.state === "pending") incident.proposal.state = "superseded";
        incident.version += 1;
        incident.response_status = "triaged";
        incident.proposal = proposalFor(state, incident, institution.id, OFFICIAL, `Urzędnik wybrał: ${institution.name}.`);
        incident.review = { reason: "proposal_ready", note: `Zlecenie dla: ${institution.name} czeka na zatwierdzenie.`, since: nowIso() };
        log(state, incident, OFFICIAL, "Wybrano odpowiedzialną instytucję", institution.name);
        log(state, incident, OFFICIAL, `Przygotowano propozycję v${incident.proposal.version}`);
        break;
      }
      case "verify":
      case "dispute":
        incident.assessment = command.type === "verify" ? "verified" : "disputed";
        incident.version += 1;
        log(state, incident, OFFICIAL, command.type === "verify" ? "Zweryfikowano" : "Zakwestionowano", command.reason);
        break;
      case "close":
        if (incident.response_status !== "resolved") throw new OperationsApiError(409, "invalid_state", "Only a resolved incident can be closed.");
        incident.response_status = "closed";
        incident.version += 1;
        log(state, incident, OFFICIAL, "Zamknięto");
        break;
      case "reopen":
        if (incident.response_status !== "resolved" && incident.response_status !== "closed") {
          throw new OperationsApiError(409, "invalid_state", "Only a resolved or closed incident can be reopened.");
        }
        incident.response_status = "triaged";
        incident.version += 1;
        incident.review = { reason: "needs_responsibility", note: `Wznowiono: ${command.reason}`, since: nowIso() };
        log(state, incident, OFFICIAL, "Wznowiono", command.reason);
        break;
    }
  });
}

export function triageReport(reportId: string, triage: ReportTriage): WorkspaceDto {
  return mutate((state) => {
    const report = findReport(state, reportId);
    expectVersion(report.version, triage.expected_version);
    if (report.incident_id && triage.decision !== "link") throw new OperationsApiError(409, "invalid_state", "This report is already linked.");

    switch (triage.decision) {
      case "link": {
        const incident = findIncident(state, triage.incident_id);
        expectVersion(incident.version, triage.expected_incident_version);
        if (!ACTIVE.has(incident.response_status)) {
          throw new OperationsApiError(409, "invalid_state", "This incident is finished. Start a new incident instead.");
        }
        incident.report_ids.push(report.id);
        incident.support_count += 1;
        incident.evidence.push({
          id: report.reference,
          kind: "report",
          label: report.reference,
          source: "Zgłoszenie mieszkańca",
          observed_at: report.observed_at,
          retrieved_at: nowIso(),
          provenance: "demo",
          state: "current",
          note: null,
        });
        incident.version += 1;
        log(state, incident, OFFICIAL, `Powiązano ${report.reference}`, triage.reason ?? "Powiązanie ręczne");
        supersedeProposal(state, incident);
        report.incident_id = incident.id;
        report.triage_state = "linked";
        break;
      }
      case "new_incident": {
        const reference = `INC-0${state.counters.incident++}`;
        const incident: IncidentDto = {
          id: reference.toLowerCase(),
          reference,
          category_id: report.category_id,
          issue_type: report.issue_type ?? "other",
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
          review: { reason: "needs_responsibility", note: "Nowe zdarzenie z ręcznego przeglądu. Wybierz, kto ma odpowiedzieć.", since: nowIso() },
          report_ids: [report.id],
          evidence: [],
          proposal: null,
          ticket: null,
          history: [],
          updated_at: nowIso(),
        };
        log(state, incident, OFFICIAL, "Utworzono zdarzenie", `Z ${report.reference}`);
        state.incidents.unshift(incident);
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
  });
}

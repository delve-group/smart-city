# Shared workflow contracts

Status: agreed integration baseline for the three workstreams, 2026-10-03 ([#21](https://github.com/delve-group/smart-city/issues/21), D042). **This document specifies contracts; it implements nothing.** Each section names the Issue that delivers it, and a route is real only once that Issue's PR is merged. Today's running behaviour is still the [implemented foundation and demo routes](api-contract.md#http-operations-by-surface).

It refines the [feature specification](../specs/001-voice-incident-response/spec.md), the [technical plan](../specs/001-voice-incident-response/plan.md) and the [frontend–backend contract](api-contract.md) into exact payloads, errors, command signatures and handoffs. Where it is more specific than those documents, this file wins for the PoC; where it is silent, they apply. Requirements are not copied here.

**Changing a contract.** Open or comment on the owning Issue/PR, name the affected consumers from [section 11](#11-ownership-and-migration-files), and change producer, consumers and this file together. A live caller is never switched ahead of its producer.

## 1. Common rules

- Envelopes, `snake_case`, opaque IDs, UTC ISO 8601 timestamps and WGS84 coordinates follow the [common wire rules](api-contract.md#common-wire-rules). Every response is `Cache-Control: no-store`.
- Success: `{ "data": …, "version"?: number, "correlation_id": string }`. `version` repeats the version (or draft revision) of the record a write changed. Collections are `{ "items": […], "next_cursor": string | null }` inside `data`.
- Failure: HTTP status plus `{ "code", "message", "retryable", "correlation_id" }`. `message` is safe to show; clients branch on `code`.
- Every write requires `Origin` equal to `APP_ORIGIN` (`403 invalid_origin`) and, when it has a body, `Content-Type: application/json`. Bodies are at most 16 KB for draft writes and 4 KB elsewhere.
- **Bodies are strict.** An unknown property — including `actor_id`, `owner`, `role`, `institution_id` where it is not a documented field, `approved`, `public`, `submission_key` or `triage_state` — is `400 invalid_request` with no effect. Identity, role and institution come only from the session (or the server credential of a tool adapter).
- Another identity's draft, report or ticket is indistinguishable from a missing one: `404 not_found`. The wrong role on a staff surface is `403 forbidden`; no session is `401 unauthenticated`.
- Every mutation runs in one database transaction. Any error in the tables below means **nothing was written**.

### Error codes

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_json`, `invalid_request` | Malformed body, unknown property, failed validation. |
| 400 | `legacy_contract_retired` | A raw-create body sent to `POST /api/reports` after the CITIZEN cutover ([section 10](#10-migration-stages)). |
| 401 / 403 | `unauthenticated` / `forbidden`, `invalid_origin` | As in the foundation. |
| 404 | `not_found` | Missing or not visible to this actor. |
| 409 | `version_conflict` | `expected_version` / `expected_revision` is not the current one. Refetch, review again. |
| 409 | `draft_incomplete` | Confirmation attempted while required fields are missing; `message` lists them. |
| 409 | `not_confirmed` | Submission of a revision that is not the confirmed current revision. |
| 409 | `draft_submitted` | Edit or confirmation of a draft that already produced a report. |
| 409 | `idempotency_conflict` | Same submission or execution identity, different payload. |
| 409 | `invalid_state` | The record's lifecycle does not allow the command (e.g. close an unresolved incident, backward ticket transition). |
| 409 | `incident_closed` | Contribution to a resolved or closed incident. |
| 409 | `stale_approval` | Decision or execution against a proposal/incident version that is no longer current, or a superseded proposal. |
| 409 | `proposal_closed` | Decision on a proposal that is already rejected, failed or executing. |
| 409 | `execution_unknown` | The connector outcome is unknown; resend is blocked until reconciliation. |
| 410 | `endpoint_retired` | A legacy route removed in the MAP cutover. |
| 429 | `rate_limited` | With `Retry-After`. |
| 503 | `dependency_unavailable` | Database or required dependency unavailable; `retryable: true`. |

### Actor context

Domain services never read cookies, headers or model output for authority. The HTTP route, client-tool route or MCP adapter authenticates and passes:

```ts
type ActorContext = { correlation_id: string } & (
  | { kind: "session"; actor: Actor }                       // resident, official or institution session
  | { kind: "system"; principal: "triage" | "decision_maker" | "executor" | "indexer" }
  | { kind: "anonymous" }                                   // public read without a session
);
```

`Actor` is the [foundation type](api-contract.md#backend-foundation-implemented). `anonymous` sees public projections only and can perform no write. `system` principals exist only inside the server (worker, MCP adapter with a scoped server credential). `decision_maker` may read scoped context, suggest triage and create proposals; `executor` may only execute an approved proposal; neither can call an official or institution command. An institution MCP credential maps server-side to one institution and is passed as a `session`-kind institution actor.

## 2. Shared shapes

### Location result

Proposed to workstream 1 on [#26](https://github.com/delve-group/smart-city/issues/26); a change requested there updates this section before either side builds on it. Workstream 1 owns geocoding and the `resolve_location` boundary; workstream 2 stores what the resident confirmed. Both use:

```ts
type LocationResult = {
  candidate_id: string | null;      // stable ID from resolve_location; null for a bare map pin
  lat: number; lng: number;         // inside the Kraków reporting bounds
  label: string;                    // 1–200 chars, human-readable, no unit
  street: string | null;            // as returned; the server normalises for matching
  building_number: string | null;
  district: string | null;
  precision: "building" | "street" | "point";
  source: "geocoder" | "map_pin" | "device";
};
type DraftLocation = LocationResult & { unit: string | null };   // unit: private, ≤ 40 chars
```

`street`/`building_number` are facts from the geocoder or the resident, never invented; `null` means unknown and sends an otherwise eligible report to review (spec §5). Responsibility is never derived from these fields.

### Draft, report and catalogue

```ts
type DraftFields = {
  category_id: string | null;       // from GET /api/categories
  issue_type: string | null;        // from GET /api/issue-types, valid for the category
  title: string | null;             // 3–80 trimmed chars → Report.summary (operator summary)
  description: string | null;       // 0–1000 trimmed chars → Report.original_observation (restricted)
  severity: "low" | "medium" | "high" | null;       // resident's impression; optional
  observed_at: string | null;
  observed_time_state: "known" | "unknown";         // default "unknown"; "known" requires observed_at
  scope: "unit" | "building" | "street" | "unknown";  // default "unknown"
  location: DraftLocation | null;
  urgent: boolean;                  // resident reports immediate danger; default false
};

type IntakeDraft = {
  id: string;
  revision: number;                 // starts at 1, +1 per accepted edit
  submission_key: string;           // server-issued, stable for the draft's lifetime
  fields: DraftFields;
  missing_fields: ("category_id" | "issue_type" | "title" | "location")[];
  readback_summary: string;         // server-built English sentence for the current revision
  confirmation: { revision: number; channel: "button" | "voice"; confirmed_at: string } | null;
  submission: { report_id: string; reference: string; triage_state: TriageState; submitted_at: string } | null;
  created_at: string; updated_at: string;
};

type TriageState = "pending" | "linked" | "needs_review" | "private_issue" | "out_of_scope";

type Report = {                     // owner and official only; never public
  id: string; reference: string;
  channel: "form" | "voice";        // channel of the confirming request
  category_id: string; issue_type: string;
  summary: string; original_observation: string;
  severity: "low" | "medium" | "high" | null;
  location: DraftLocation;
  observed_at: string | null; observed_time_state: "known" | "unknown";
  submitted_at: string;
  scope: "unit" | "building" | "street" | "unknown";
  urgent: boolean;
  triage_state: TriageState;
  incident_id: string | null;
  resident_next_step: string | null;  // set with private_issue / out_of_scope
  version: number;                  // positive, starts at 1
  provenance: "demo";
};
```

`GET /api/issue-types` (public, [#23](https://github.com/delve-group/smart-city/issues/23)) returns `{ "items": [{ "id", "category_id", "label" }] }`. IDs are server configuration; the contract fixes only `power_outage` (category `power`, the single auto-grouped type) and `other`, which every category accepts. The legacy `GET /api/categories` envelope is unchanged until MAP.

### Public incident

```ts
type PublicIncident = {
  id: string; reference: string;
  category_id: string; issue_type: string;
  public_summary: string;           // controlled template text, never report text
  scope: "building" | "street";
  assessment: "suspected" | "corroborated" | "verified" | "disputed";
  response_status: "new" | "triaged" | "assigned" | "in_progress" | "resolved" | "closed";
  support_count: number;            // distinct identities; demo, unverified
  accepts_contributions: boolean;   // false once resolved or closed
  viewer_support: "reporter" | "contributor" | null;  // for the current session, else null
  public_location: { lat: number; lng: number; label: string; precision: "street" | "building" };
  created_at: string; updated_at: string;
  timeline: { id: string; kind: TimelineKind; occurred_at: string; text: string }[];
  provenance: "demo" | "live";
};
type TimelineKind = "reported" | "corroborated" | "verified" | "disputed" | "assigned" | "acknowledged"
  | "work_started" | "resolved" | "returned_to_review" | "closed" | "reopened";
```

`timeline[].text` comes from a template per kind. Institution notes, official reasons and report text never appear in it.

### Official and institution shapes

The official workspace keeps the wire types already in [`src/api/operations/types.ts`](../apps/frontend/src/api/operations/types.ts) (`WorkspaceDto`, `IncidentDto`, `OperationsReportDto`, `ProposalDto`, `TicketDto`, evidence and history). Persistence replaces the store behind them; additive changes made by [#25](https://github.com/delve-group/smart-city/issues/25)/[#27](https://github.com/delve-group/smart-city/issues/27) are recorded here when they land. Additions made with #27: reports carry `issue_type`, `scope` and `urgent`; proposals carry `execution_error: string | null`; tickets carry `version`. A report still `pending` a minute after submission appears in the queue with review reason `pending_triage`, so a stopped worker never hides it.

```ts
type InstitutionTicket = {
  id: string; reference: string; institution_id: string;
  status: "created" | "acknowledged" | "in_progress" | "resolved" | "rejected";
  version: number;
  payload: { key: string; value: string }[];        // copy of the approved proposal payload
  incident: { id: string; reference: string; category_id: string; issue_type: string;
              public_summary: string; public_location: PublicIncident["public_location"] };
  expected_resolution_at: string | null;
  result_note: string | null;
  events: { status: InstitutionTicket["status"]; at: string; note: string | null }[];
  created_at: string; updated_at: string;
  provenance: "demo";
};
```

It carries no reporter identity, report text, unit detail or official note.

## 3. Resident intake

Delivered by [#23](https://github.com/delve-group/smart-city/issues/23). All routes need a resident session (`POST /api/auth/guest` first). Voice client tools and the form call the same routes.

| Operation | Body | Success | Errors beyond the common ones |
| --- | --- | --- | --- |
| `POST /api/report-drafts` | `{ "fields"?: Partial<DraftFields> }` | `201 IntakeDraft`, `version` = 1 | — |
| `GET /api/report-drafts/{id}` | — | `200 IntakeDraft` | — |
| `PATCH /api/report-drafts/{id}` | `{ "expected_revision": number, "fields": Partial<DraftFields> }` | `200 IntakeDraft`, revision +1, `confirmation: null` | `version_conflict`, `draft_submitted` |
| `POST /api/report-drafts/{id}/confirmation` | `{ "revision": number, "channel": "button" \| "voice" }` | `200 IntakeDraft` with `confirmation` | `version_conflict`, `draft_incomplete`, `draft_submitted` |
| `POST /api/reports` | `{ "draft_id": string, "revision": number }` | `201 Report` first time, `200` same `Report` on replay; `version` = report version | `not_confirmed`, `idempotency_conflict` |
| `GET /api/reports/{id}` | — | `200 Report` (owner or official) | — |

A `PATCH` merges the given fields; `null` clears one. Sending `observed_at` without a state sets `observed_time_state: "known"`; sending `"unknown"` (or `observed_at: null`) clears the time; a time more than five minutes in the future is rejected. A category/issue-type pair that does not match the catalogue is `400 invalid_request`. Any accepted edit drops the confirmation. Confirming an already confirmed revision returns the existing confirmation. The server derives the submission identity `(owner, submission_key)` from the draft; clients never send a key.

**Edit, confirm, submit.**

```http
PATCH /api/report-drafts/d_7Qm2 
{ "expected_revision": 2, "fields": { "scope": "street",
  "location": { "candidate_id": "photon:W123", "lat": 50.05806, "lng": 19.94532, "label": "ul. Józefa Dietla 44",
                "street": "Józefa Dietla", "building_number": "44", "district": "Stare Miasto",
                "precision": "building", "source": "geocoder", "unit": null } } }

200 { "data": { "id": "d_7Qm2", "revision": 3, "submission_key": "sk_91c…", "fields": { … },
                "missing_fields": [], "readback_summary": "Power outage on the street at ul. Józefa Dietla 44, time not known.",
                "confirmation": null, "submission": null, … },
      "version": 3, "correlation_id": "…" }
```

```http
POST /api/report-drafts/d_7Qm2/confirmation   { "revision": 3, "channel": "voice" }
200 { "data": { …, "revision": 3, "confirmation": { "revision": 3, "channel": "voice", "confirmed_at": "2026-10-03T12:04:11Z" } }, "version": 3, … }

POST /api/reports   { "draft_id": "d_7Qm2", "revision": 3 }
201 { "data": { "id": "rep_4f1…", "reference": "R-26-000311", "channel": "voice", "category_id": "power",
                "issue_type": "power_outage", "observed_at": null, "observed_time_state": "unknown",
                "scope": "street", "triage_state": "pending", "incident_id": null, "version": 1, "provenance": "demo", … },
      "version": 1, "correlation_id": "…" }
```

`triage_state: "pending"` is the only claim a submission makes. It never implies triage, AI review or dispatch.

**Conflicts — each leaves the database unchanged.**

```http
PATCH …/d_7Qm2 { "expected_revision": 2, … }      → 409 { "code": "version_conflict", "message": "This draft changed. Load the latest revision.", "retryable": false, … }
POST /api/reports { "draft_id": "d_7Qm2", "revision": 3 }   after an edit to revision 4
                                                  → 409 { "code": "not_confirmed", … }
```

**Replay and recovery.** The submission transaction locks the draft row, inserts the report with `UNIQUE (owner_id, submission_key)`, marks the draft submitted and enqueues work ([section 8](#8-transactional-work-interface)) before committing. Therefore:

- Repeating `POST /api/reports { draft_id, revision }` with the submitted revision returns `200` and the same report; concurrent identical requests produce one report and one triage work item.
- The same draft with a different `revision` after submission is `409 idempotency_conflict`.
- After a lost response, `GET /api/report-drafts/{id}` shows `submission: { report_id, reference, … }`; no second `POST` is needed. A new intended report needs a new draft.

## 4. Public incidents and contributions

Delivered by [#25](https://github.com/delve-group/smart-city/issues/25).

| Operation | Request | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/incidents` | Query: `bbox=west,south,east,north`, `category_id`, `assessment`, `response_status` (each repeatable), `limit` (1–200, default 100), `cursor` | `200 { items: PublicIncident[], next_cursor }`, newest update first | `invalid_request` |
| `GET /api/incidents/{id}` | — | `200 PublicIncident` | `not_found` (also for private-only cases) |
| `POST /api/incidents/{id}/contributions` | No body; resident session | `201` new membership, `200` existing: `{ "incident_id", "membership": "reporter" \| "contributor", "support_count", "assessment" }` | `incident_closed` |

Reads need no session; with one, `viewer_support` is filled. A resident already represented by a linked report gets `200` with `membership: "reporter"` and an unchanged count.

```http
POST /api/incidents/inc_0142/contributions
201 { "data": { "incident_id": "inc_0142", "membership": "contributor", "support_count": 4, "assessment": "corroborated" }, "version": 7, … }
(repeat) 200 { "data": { … "support_count": 4 … }, "version": 7, … }
(resolved case) 409 { "code": "incident_closed", "message": "This incident is finished. Create a new report if the problem is back.", … }
```

A support change may move `suspected` ↔ `corroborated` only (two distinct identities is the demo threshold) and never alters `verified` or `disputed`. A new membership or a newly linked report increments the incident version (and so supersedes an unexecuted proposal); a repeat changes nothing. A resident who is already a member is answered `200` even on a finished incident.

Automatic triage (`triage` work, or `triageReport` called by the decision-maker) applies the grouping policy of spec §5 from the primary store alone: the policy version, limits and outcome are stored on the report (`triage_policy`), a caller's suggested incident is recorded but never widens eligibility, and a report whose version changed since the work was queued is left untouched. Urgent, unit-only, non-outage, unknown-time/scope/street and ambiguous reports go to review with a reason and candidate list; they never create a public incident.

## 5. Official commands

Delivered by [#27](https://github.com/delve-group/smart-city/issues/27); the domain services behind the triage commands arrive with [#25](https://github.com/delve-group/smart-city/issues/25). Official session only. These are **human authority**: no resident, dispatcher tool, decision-maker tool or executor path reaches them. Each returns `200` with the refreshed workspace (`WorkspaceDto`) and `version` of the changed record, and writes an audit event with actor, reason and correlation ID.

| Operation | Body | Versions and reason | Effect |
| --- | --- | --- | --- |
| `GET /api/operations/review` | — | — | Workspace: queue, incidents, staff-visible reports, institutions. |
| `GET /api/operations/incidents/{id}` | — | — | One `IncidentDto` with linked reports, evidence, proposals, history. |
| `POST /api/operations/reports/{id}/triage` | `{ "decision": "link", "expected_version", "incident_id", "expected_incident_version", "reason"? }` | Report + target incident version. `reason` required when the report is already linked (**link correction**); a human link may override automatic eligibility. | Links/relinks; history keeps the earlier link; support recomputed on both incidents; both incident versions +1. |
| | `{ "decision": "new_incident", "expected_version", "reason"? }` | Report version. | New `suspected` incident anchored at the report. |
| | `{ "decision": "private_issue" \| "out_of_scope", "expected_version", "reason" }` | Report version; `reason` required and becomes `resident_next_step`. | Disposition; unlinks if linked. |
| `POST /api/operations/reports/{id}/classification` | `{ "expected_version", "category_id"?, "issue_type"?, "scope"?, "reason" }` | Report version; `reason` required. | Corrects classification; the original observation is untouched; triage is re-queued unless the report is linked. |
| `POST /api/operations/incidents/{id}/commands` | `{ "type": "choose_institution", "expected_version", "institution_id" }` | Incident version. | **Responsibility selection**: creates a pending proposal, never a ticket. `invalid_state` with an active ticket or finished incident. |
| | `{ "type": "verify", "expected_version", "evidence_ids": string[≥1], "reason" }` | Incident version; evidence must belong to the incident. | `assessment: verified`. |
| | `{ "type": "dispute", "expected_version", "reason", "evidence_ids"? }` | Incident version. | `assessment: disputed`. |
| | `{ "type": "close", "expected_version" }` | Incident version. | `resolved` → `closed`; else `invalid_state`. |
| | `{ "type": "reopen", "expected_version", "reason" }` | Incident version. | `resolved`/`closed` → `triaged`, review item; terminal ticket retained. |
| `POST /api/action-proposals/{id}/decision` | `{ "decision": "approved", "expected_proposal_version", "expected_incident_version" }` or `{ "decision": "rejected", …, "reason" }` | Both versions. | Approval stores actor and both versions and enqueues execution in the same transaction. Rejection creates no ticket. |
| `POST /api/action-proposals/{id}/reconciliation` | `{ "expected_proposal_version", "reason" }` | Proposal version. | For a proposal in `unknown`: looks the execution key up at the connector and records `executed` (existing ticket) or `failed` (no effect, retry allowed). |

```http
POST /api/action-proposals/prop_81a/decision
{ "decision": "approved", "expected_proposal_version": 2, "expected_incident_version": 7 }
200 { "data": { …workspace; proposal.state "approved" → "executed" once the executor ran… }, "version": 2, … }

(incident meanwhile at version 8)
409 { "code": "stale_approval", "message": "The incident changed after this proposal was prepared. Review the current proposal.", "retryable": false, … }

POST /api/operations/incidents/inc_0142/commands   { "type": "verify", "expected_version": 6, "evidence_ids": ["ev_12"], "reason": "Operator confirmed feeder fault" }
409 { "code": "version_conflict", … }               ← incident is at 7; assessment, history and proposals untouched
```

**Expected-version writes.** Every command issues `UPDATE … SET version = version + 1 … WHERE id = $1 AND version = $2` inside its transaction. Zero rows for an existing, visible record raises `version_conflict` and rolls back everything else in that transaction, including audit rows and enqueued work.

**Approval replay.** Approving an `approved`, `executing` or `executed` proposal again with the same versions returns `200` and the current state; it never enqueues a second execution. A decision on a `superseded` proposal is `stale_approval`; on `rejected`/`failed` it is `proposal_closed`.

**Authority split.**

| Principal | May | May not |
| --- | --- | --- |
| Official (session) | Every command in this section. | Edit an executed payload; execute directly. |
| Decision-maker (`system`) | `triage_report` suggestion under deterministic eligibility, `propose_action`, scoped reads. | Decide a proposal, override eligibility, verify, close, reopen, choose a destination outside the registry. |
| Executor (`system`) | `executeApprovedProposal(proposal_id)` only. | Supply a destination or payload; approve; run without a current approval. |

## 6. Execution identity

Delivered by [#27](https://github.com/delve-group/smart-city/issues/27). The execution key is `execute:proposal:{proposal_id}`, stored with the proposal and used both as the `execute` work idempotency key and as the connector's request key. `service_tickets.proposal_id` is unique, and a partial unique index allows one non-terminal ticket per incident. The executor claims `approved → executing` atomically, rechecks proposal and incident versions (except for an already `executed` proposal, which returns its ticket first), calls the demo connector with the key, and records `executed`, `failed` (known no effect; retry allowed after revalidation) or `unknown` (resend blocked until reconciliation). The connector is idempotent by key and supports lookup by key. Execution records its own `triaged → assigned` transition and does not invalidate itself. There is no public execute route.

The `execute` handler answers `retry` for a known no-effect failure (the same key is sent again after revalidation, within the worker's bounded retries) and `failed` with reason `execution_unknown` for an unknown outcome, which is never resent automatically. Reconciliation looks the key up at the connector: a found request becomes the ticket; otherwise the proposal is `failed` and the official prepares a fresh proposal. While a proposal is `executing` or `unknown`, new proposals and approvals for that incident are refused with `execution_unknown`.

Until the decision-maker ([#34](https://github.com/delve-group/smart-city/issues/34)) exists, a labelled **rule-based proposer (demo)** prepares the pending proposal whenever an active incident with exactly one configured institution changes materially. It uses no model, follows the same `propose_action` rules and is superseded by any later proposal. `proposeAction` (decision-maker only) requires the single configured institution and evidence IDs stored on the incident.

## 7. Institution tickets

Delivered by [#31](https://github.com/delve-group/smart-city/issues/31). Institution session only; the institution comes from the account.

| Operation | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/institution/tickets` | Query: `status` (repeatable), `limit`, `cursor` | `200 { items: InstitutionTicket[], next_cursor }` | — |
| `GET /api/institution/tickets/{id}` | — | `200 InstitutionTicket` | `not_found` for another institution's ticket |
| `PATCH /api/institution/tickets/{id}` | `{ "status": "acknowledged" \| "in_progress" \| "resolved" \| "rejected", "expected_version", "note"?, "expected_resolution_at"? }` | `200 InstitutionTicket`, `version` | `version_conflict`, `invalid_state`, `not_found` |

`note` (3–500 chars) is required for `resolved` and `rejected` and optional otherwise; it is stored on the ticket event and shown to the official, never on the public timeline. Transitions follow spec §4; anything else is `invalid_state`. Acknowledgement leaves the incident `assigned`; `in_progress` and `resolved` move it; `rejected` returns it to `triaged` with review reason `ticket_rejected`, clears the responsible institution and creates no replacement proposal. The same `listTickets` / `getServiceTicket` / `updateServiceTicket` services in `server/institutions/tickets.ts` back the HTTP routes and the later MCP tools.

```http
PATCH /api/institution/tickets/tkt_22c   { "status": "resolved", "expected_version": 3, "note": "Feeder repaired, supply restored." }
200 { "data": { "id": "tkt_22c", "status": "resolved", "version": 4, "result_note": "Feeder repaired, supply restored.", … }, "version": 4, … }

(as the Water Services account)  GET /api/institution/tickets/tkt_22c  → 404 { "code": "not_found", … }
(stale)                          409 { "code": "version_conflict", … }     ← ticket, incident and timeline untouched
```

The ticket change, incident status/version, public timeline event, audit event and index work commit together.

## 8. Transactional work interface

Workstream 3 owns the work schema (`002_jobs.sql`, no foreign keys to domain tables), the worker and `server/jobs`; workstream 2 calls `enqueueWork` inside its own transactions and supplies domain handlers. Delivered by [#22](https://github.com/delve-group/smart-city/issues/22); final names may differ only if this section is updated in that PR.

```ts
type WorkKind = "triage" | "index" | "execute";
type WorkSource = { type: "report" | "incident" | "service_ticket" | "action_proposal"; id: string; version: number };

/** Uses the caller's open transaction: the work row commits or rolls back with the domain write. */
function enqueueWork(client: PoolClient, work: {
  kind: WorkKind;
  source: WorkSource;
  idempotency_key: string;                  // unique; a repeat returns the existing row
  payload?: Record<string, string | number | boolean | null>;   // ≤ 2 KB, IDs and flags only
  correlation_id: string;
}): Promise<{ work_id: string; created: boolean }>;

type WorkItem = { id: string; kind: WorkKind; source: WorkSource; payload: Record<string, unknown>;
                  attempt: number; correlation_id: string };
type WorkResult =
  | { status: "done"; detail?: string }
  | { status: "retry"; reason: string }     // transient dependency; at most two retries, then failed
  | { status: "failed"; reason: string }    // visible to the official; no automatic retry
  | { status: "parked"; reason: string };   // cannot run yet; not counted as an attempt

function registerWorkHandler(kind: WorkKind, handler: (work: WorkItem) => Promise<WorkResult>): void;
```

| Kind | Source | Idempotency key | Enqueued by | Handler |
| --- | --- | --- | --- | --- |
| `triage` | `report` at its version | `triage:report:{id}:v{version}` | Submission (#23); classification change (#27) | Workstream 2, `server/incidents` (#25). Re-reads the report; a stale version is `done` with detail `superseded`. |
| `index` | `report` / `incident` / `service_ticket` at its version | `index:{type}:{id}:v{version}` | Every source mutation (#23, #25, #27, #31) | Workstream 3 (#32), reading [section 9](#9-search-source-projections). |
| `execute` | `action_proposal` at its version | `execute:proposal:{id}` | Approval (#27) | Workstream 2, `server/actions` (#27). |

Workstream 2 exports `registerDomainWorkHandlers()` from `server/work-handlers.ts`; the worker calls it once at startup. It registers `triage` now and `execute` with #27.

Rules: payloads never hold credentials, narratives or personal data — handlers re-read the source. Handlers open their own transactions and make provider calls outside them. The worker runs one item per source at a time, leases and reclaims after restart, and parks a kind with no registered handler without consuming attempts. A handler result of `failed` or exhausted `retry` is surfaced through the domain's `processing` field, not hidden. An `enqueueWork` failure fails the domain transaction; an unavailable worker, LLM or Qdrant never does.

## 9. Search source projections

Workstream 2 exports from `server/search-sources` (delivered incrementally by #23, #25, #27, #31); workstream 3 owns Qdrant, retrieval and `GET /api/search/records`.

```ts
type SourceRef = { record_type: "report" | "incident" | "service_ticket"; record_id: string };
type Audience = { kind: "public" } | { kind: "official" } | { kind: "institution"; institution_id: string };

type SearchSource = SourceRef & {
  version: number;
  updated_at: string;
  category_id: string | null;
  issue_type: string | null;
  location: { lat: number; lng: number } | null;
  projections: { audience: Audience; title: string; text: string }[];   // empty ⇒ remove from the index
};

function getSearchSource(ref: SourceRef): Promise<SearchSource | null>;   // null ⇒ deleted
function listSearchSourceRefs(type: SourceRef["record_type"], cursor: string | null):
  Promise<{ items: (SourceRef & { version: number })[]; next_cursor: string | null }>;   // rebuild/reconcile
/** Recheck at query time: the caller's current, permitted projection, or null. */
function hydrateSearchHit(ctx: ActorContext, ref: SourceRef): Promise<
  { ref: SourceRef; version: number; title: string; excerpt: string; category_id: string | null } | null>;
```

| Record | Public projection | Official projection | Institution projection |
| --- | --- | --- | --- |
| `report` | None, ever. | Summary, original observation, location label, classification. | None. |
| `incident` | `public_summary`, public location label, category/issue — only when a `PublicIncident` exists. | Title, linked report summaries, evidence labels. | None. |
| `service_ticket` | None. | Reference, payload, status, result note. | Same, for the assigned institution only. |

`hydrateSearchHit` with an `anonymous` context (or any non-official caller) returns only the public incident projection; reports and tickets return `null` for it. Point identity is `(record_type, record_id, audience)`. An index entry older than the source `version`, or whose `hydrateSearchHit` returns `null`, must not be returned.

## 10. Migration stages

| Stage | Issue / owner | Server change | Callers | Still working |
| --- | --- | --- | --- | --- |
| INTAKE | [#23](https://github.com/delve-group/smart-city/issues/23) / Franek | New draft routes and durable submission. **Compatibility mechanism:** `POST /api/reports` discriminates on body shape — a body with `draft_id` is the durable, authenticated submission; the legacy raw-create body still reaches the labelled in-memory mock. | None switched. | Legacy form, map, `GET /api/reports`, confirmations. |
| CITIZEN | [#26](https://github.com/delve-group/smart-city/issues/26) / Rafal, server reviewed by Franek | Remove only the raw-create branch: such a body now gets `400 legacy_contract_retired`. | Form submits `{ draft_id, revision }`. | Legacy `GET /api/reports` and confirmations (labelled demo). |
| MAP | [#28](https://github.com/delve-group/smart-city/issues/28) / Rafal, server reviewed by Franek | `GET /api/reports` and `POST /api/reports/{id}/confirmations` return `410 endpoint_retired`; `GET /api/categories` moves to the common envelope. | Map, search, counts, detail, nearby and contribution switch to `PublicIncident` together. | — |

Durable reports are private. They are never added to the in-memory list or returned by legacy `GET /api/reports` at any stage.

## 11. Ownership and migration files

| Area | Owner | Consumers to notify on change |
| --- | --- | --- |
| `server/reports`, `server/incidents`, `server/actions`, `server/institutions`, `server/search-sources`; domain migrations and fixtures; `/operations` and institution UI | Franek | Rafal (sections 2–4, 10), agent-3 (sections 5–9) |
| `resolve_location`, `server/voice`, citizen features and their `src/api` clients; `LocationResult` producer | Rafal | Franek (`DraftLocation`), agent-3 (dispatcher tools) |
| `server/jobs` and worker, `server/search`, `server/agents`, `server/mcp`, Compose/deployment | agent-3 | Franek (section 8 callers), Rafal (public search) |

Migration filenames are reserved on the claiming Issue against current `main` and open PRs. Reserved so far: `002_jobs.sql` (agent-3, #22), `003_report_intake.sql` (#23), `004_incident_triage.sql` (#25), `005_actions_tickets.sql` (#27). Applied migrations are never edited.

## 12. Requirement traceability

Boundary-level only; end-to-end verification belongs to the implementing Issues and [#35](https://github.com/delve-group/smart-city/issues/35).

| Requirement | Contract boundary |
| --- | --- |
| FR-003 | Confirmation binds `revision` + `channel`; any `PATCH` clears it (§3). |
| FR-004 | One `POST /api/reports { draft_id, revision }` for form and voice; `missing_fields`; explicit `unknown` time/scope (§2–3). |
| FR-005 | `(owner, submission_key)` uniqueness, `200` replay, `idempotency_conflict` (§3). |
| FR-006 | `Report.version`, expected-version update rule, link-correction history (§3, §5). |
| FR-012 | Decision endpoint is official-only; decision-maker limited to `propose_action` (§5). |
| FR-013 | Approval stores both versions; execution key and uniqueness rules (§5–6). |
| FR-014 | Ticket transitions, `expected_version`, institution scope (§7). |
| FR-015, FR-017 | `PublicIncident` allowlist; reports never public; template timeline (§2, §4, §9–10). |
| FR-016 | Contribution membership and `support_count` semantics (§4). |
| FR-018 | Every command writes an audit event in its transaction (§5, §7). |
| FR-019, FR-020 | `ActorContext`, strict bodies, `404` for foreign records (§1). |
| SC-003 | Rejection creates no ticket; approval replay; `stale_approval` (§5–6). |
| SC-005 | Cross-institution `404`; residents and `system` principals barred from official commands (§1, §5, §7). |
| SC-007 | Atomic domain write + `enqueueWork`; draft recovery; `execution_unknown` and reconciliation (§3, §6, §8). |
| SC-008 | Public shapes exclude identities, narrative, unit and notes; projections per audience (§2, §9). |

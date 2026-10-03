# Feature specification: voice reporting and incident response

Feature: `001-voice-incident-response` · Created: 2026-10-03 · Status: backend foundation, durable worker and the server-side response workflow implemented; citizen UI cutover, voice, search and the decision-maker pending.

Input: the resident-to-institution workflow in the [discovery brief](../../docs/plans/2026-10-03-voice-incident-design.md), followed by the user's confirmation of browser-first intake and **ElevenLabs** as the voice provider.

This is the current PoC requirements baseline for this feature. It supersedes the discovery draft's provider comparison and narrows the broader [platform vision](../../spec.md) to one working response loop. [AGENTS.md](../../AGENTS.md) remains the source of working rules. Technical implementation constraints are in [plan.md](plan.md). These documents are prepared for Spec Kit; the toolkit has not been installed or run.

The first implementation deliberately stops at local PostgreSQL startup, migrations, fictional demo staff accounts, persistent guest/staff sessions and health/access-check APIs. The existing report map still uses its in-memory demo routes. Persistent reports, versioned report commands, incidents, ElevenLabs, Qdrant, background processing and Scaleway deployment remain subsequent slices; the foundation does not satisfy the full user stories below. [The API contract](../../docs/api-contract.md#backend-foundation-implemented) identifies the available routes.

Later slices have since landed on `main`: owned drafts with idempotent submission, deterministic triage into incidents with a public projection and contributions, the official workspace with versioned approval and exactly-once demo ticket execution, and the institution inbox. The resident form and map still use the in-memory demo routes until their coordinated cutover; ElevenLabs, Qdrant, the LLM decision-maker, deployment rehearsal and the acceptance scenarios as a whole remain open. Route-by-route state is in the [API contract](../../docs/api-contract.md) and exact payloads in the [shared workflow contracts](../../docs/workflow-contracts.md).

## 1. Outcome and scope

A resident describes a city problem without choosing a department. The system clarifies the observation, records it once, groups related reports into an incident, proposes an institutional response, and lets an official approve it. The assigned institution records progress, and residents see a public incident timeline.

### Confirmed constraints

- ElevenLabs Agents handles browser voice. Telephone intake and outbound calls come later.
- Reports and incidents are separate entities. Dispatcher, decision-maker and institution are distinct roles with different authority.
- An official approves a specific action before the system contacts an institution or creates its ticket.
- Keep the existing Next.js, Appica, map, category and form foundations. Qdrant is the selected search index; see [D029 and its implementation guide](../../docs/knowledge-base/qdrant-search.md).
- Search covers reports, incidents and service tickets using their titles/summaries, descriptions and permitted metadata. Indexing does not make private records public; each caller receives only its authorized projection.
- Local development starts through one documented command and reports missing or invalid required environment settings before starting dependent services. The eventual Scaleway deployment follows the same validation rule. Plan for roughly 15 concurrent application users, with 30 as the demo planning bound; capacity is unverified.
- Government identity is simulated. Utility telemetry and institution integration are also explicitly labelled demo data/services.
- Documentation, code and authored agent instructions are English. Interface copy is English and Polish (D054). The voice dispatcher understands Polish observations and responds in Polish, including clarification, confirmation and saved references (D064). Preserve Polish place names. Stored operator summaries remain English; original observations remain private.

### Specification defaults

These reversible choices make the specification concrete; they are not additional claims of explicit user approval:

- One city: Kraków, using the existing reporting bounds. One reference scenario: a street power outage, plus apartment-only and unrelated nearby reports as counterexamples.
- Demo institutions: Electricity Operator and Water Services, each visibly fictional. Electricity handles the reference workflow; Water Services supplies the cross-institution permission check and water-category fixture.
- A server-issued guest identity is enough to submit. Optional “mObywatel — demo” login chooses a fictional resident profile. Staff use separately provisioned demo accounts; a public role switch cannot grant staff access.
- One active service ticket per incident. Multi-agency work orders, multiple simultaneous assignments and automatic incident merging are deferred.
- Live status becomes visible within five seconds on an active screen under the agreed demo conditions. This is a target to verify, not measured performance.

### Included

Browser voice and form intake; address clarification and summary confirmation; persistent reports/incidents; related-record search; bounded automatic triage; an operator review queue; explained action proposals; approval/rejection; an institution inbox; status feedback; audit history; public/private data separation; repeat-request handling; visible failure states.

### Excluded

Real phone numbers or outbound calls; real government authentication; production utility APIs or telemetry; emergency dispatch; real ownership determination from cadastral maps; X ingestion; civic-budget voting; financial/SLA administration; multi-city onboarding; production SSO; a distributed actor framework; additional city simulation features. Existing map settings and 3D display remain part of the baseline. No new automated tests during the PoC unless requested.

## 2. User stories and acceptance scenarios

All acceptance scenarios below are manual review cases, not instructions to generate automated tests. P1 stories form the minimum complete response loop; P2 adds the explicitly requested demo identity.

### US1 — Report by voice without knowing the institution (P1)

As a resident, I can speak to the city assistant, correct misunderstandings and receive a report reference.

1. Given microphone permission, when I describe an outage without a building number, the dispatcher asks for the missing location and scope before submission.
2. Given multiple matching addresses, when I select or describe one, the dispatcher reads back the chosen location and shows it on the map. It does not invent coordinates.
3. Given a confirmed summary, when I submit by voice or button, the server returns one report reference and the agent announces success only after that response.
4. Given the save succeeded but the response was lost, when submission is retried with the same identity and key, I receive the same reference and no duplicate report.
5. Given denied microphone permission, a provider error or an ended conversation, I can continue in the form with the available draft preserved. Switching to the form closes voice capture and reuses the draft's submission key.

### US2 — Combine related observations without losing them (P1)

As an official, I see one incident supported by several reports, rather than several separate jobs for the same outage.

1. Given three distinct demo residents reporting the same street outage within the configured matching limits, triage produces one incident containing three report IDs and three distinct supporting identities.
2. Given a blocked drain or a street-light fault nearby, it is not grouped into the power-outage incident merely because it shares coordinates or the broad `power` category.
3. Given two plausible existing incidents or uncertain scope, the report remains in the review queue with candidate links and a reason. It is not lost or silently attached.
4. Given an apartment-only report, it stays private and awaiting scope review; it does not automatically expand the street outage or create a public apartment marker.
5. Given simultaneous submissions, the persisted result satisfies the same grouping rules without duplicate incident creation. The losing transaction re-evaluates current candidates.

### US3 — Review evidence and approve a concrete response (P1)

As an official, I can see why the agent recommends a destination and exactly what will be sent.

1. Given a triaged incident, the proposal names the configured institution, action and payload, and cites stored reports/observations with their timestamps and demo labels.
2. Given a pending proposal, rejection records a reason and creates no service ticket.
3. Given approval, execution creates exactly one ticket associated with that proposal. Repeated approval/execution returns the original result.
4. Given a changed incident or proposal, approval/execution of its old version is rejected as stale and requires reviewing a fresh proposal.
5. Given no known responsible institution, the case remains in review. The agent does not invent a contact, send a message or instruct the resident to find a department.

### US4 — Handle assigned work within an institution (P1)

As an institution operator, I can acknowledge my ticket, record work and report the result.

1. Given an Electricity Operator ticket, its operator can acknowledge it, mark work started and report resolution with a note.
2. Given the same ticket, the Water Services operator is denied both reading its private details and changing its status, including by direct API/tool calls.
3. Given a rejected ticket, the incident returns to the official's review queue with the rejection reason. It is not shown as work in progress.
4. Given a stale ticket version, the update is rejected and the operator is shown the current state.

### US5 — Follow the incident and report being affected (P1)

As a resident, I can see known disruptions, support an existing incident and understand what the city is doing.

1. Given a publishable suspected incident, its public card shows its assessment, response status, public location and last update, clearly distinguished from verified information.
2. Given an acknowledged/started/resolved ticket, an active resident screen shows the corresponding update within the five-second target.
3. Given a resident already represented by a linked report or an “I'm affected too” contribution, repeating that contribution does not increase the distinct-support count.
4. Given a public API response or search result, it contains no resident identifiers, apartment details, original private narratives, voice transcript or internal operational notes.
5. Given a resolved/closed incident, it remains available in history but accepts no new affected contribution. A new report is triaged as a possible recurrence, not added to the resolved case automatically.

### US6 — Use clearly simulated identity (P2)

As a demo resident, I can choose a fictional identity without confusing the prototype with a government service.

1. The simulated login is labelled before entry and while active; it never requests a real PESEL, identity document or government credential.
2. The same fictional profile has a stable server identity across demo sessions. A guest remains labelled unverified; clearing guest session state can create a new identity and is not presented as person-level deduplication.
3. Browsing and submitting do not require the simulated login. Selecting a resident profile never grants operator or institution permissions.

## 3. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-001 | Voice uses ElevenLabs Agents. The UI exposes start, mute, end, connection/error state, visible transcript and an editable structured summary. No recording begins before a user action and microphone permission. |
| FR-002 | The dispatcher clarifies city/location, issue type, observation time and affected scope. Unknown facts remain unknown. It does not require the resident to select an institution. |
| FR-003 | Before submission, the resident confirms the current location and summary. Any correction invalidates the previous confirmation. A confirmation can be spoken or made with a button; save it with the draft revision and confirmation channel. |
| FR-004 | Form and voice submit through the same validated report operation. Require a city-supported category, issue description and confirmed location; allow unknown observation time and scope. Uncertain category is clarified or selected in the form before submission. |
| FR-005 | Persist each submission once per identity and submission key; retain the same reference across retries. The same key with a different payload produces a conflict, not an overwrite. |
| FR-006 | Store reports independently of incidents, with at most one current incident link per report. Each report has a positive integer version, starting at 1. Every mutation checks the expected version atomically and increments it; a stale write has no effect and returns a version conflict. Reassignment preserves history, authorship, original observation and reason. |
| FR-007 | Retrieve related candidates using Qdrant and authoritative current records. Index reports, incidents and service tickets using access-scoped text projections and stable record type/ID pairs. Ranking scores are not confidence probabilities and do not authorise grouping. Preserve uncategorized search records as required by D029. |
| FR-008 | Apply the grouping rules in section 5. Ambiguous or failed triage creates a visible review item; report persistence does not depend on AI or search availability. |
| FR-009 | Keep incident assessment separate from response progress. Distinct resident support can corroborate, but never automatically verify, a report. |
| FR-010 | Resolve responsibility using configured category/issue, territory and optional asset rules. Zero or multiple applicable institutions require human review. Record the mapping source/version. |
| FR-011 | Evidence carries source, observation/retrieval times and demo/live provenance. Missing, stale and contradictory observations are represented explicitly; missing is never treated as a zero reading. |
| FR-012 | An agent may propose an action but cannot approve it. The official reviews the destination, payload, reasons and evidence references before approving/rejecting. |
| FR-013 | Execution requires an authorised approval of the current proposal and incident version. Serialize execution; create at most one ticket for each approved proposal and at most one active ticket per incident. |
| FR-014 | The institution can read and update only assigned tickets using the transitions in section 4. Acknowledgement, work started and resolution are distinct events. |
| FR-015 | The public map, search, counts and detail panel use incidents. Reports remain visible to their submitting identity and authorised staff. Unit-only/unreviewed-private reports have no public incident projection. |
| FR-016 | Compute incident support from the union of linked reporting identities and affected contributions. Count an identity once per incident; expose the demo/unverified nature of that count. |
| FR-017 | Public incident summaries and locations use an allowlisted projection, including category, assessment, progress, support count and update time. Do not publish raw report text or unreviewed generated summaries. |
| FR-018 | Write an audit event for triage, relinking, evidence changes, proposals, approval/rejection, execution, institution updates and reopening. Include actor, record IDs, time, reason/result and correlation ID. |
| FR-019 | Enforce role and institution scope in every API/tool handler. Neither a prompt, client role value, proposed institution ID nor MCP tool visibility grants authority. |
| FR-020 | Support guest intake and optional labelled government-identity simulation. Use separate server-authenticated staff sessions. Keep provider keys and privileged service credentials out of browser code and returned payloads. |
| FR-021 | A voice disconnect stops microphone use but does not undo a committed report. Reconcile pending submissions before retrying. Never use post-conversation analysis as the primary report creation mechanism. |
| FR-022 | Preserve entered data after recoverable errors. Distinguish empty search, unavailable search, unresolved location, rejected action and unknown execution outcome. Provide a retry, correction, form or human-review path. |
| FR-023 | Render status with text, support keyboard access and both existing themes, and retain form access when voice is unavailable. Do not embed a provider widget that replaces the Appica design system. |
| FR-024 | Persist records across application restarts. Cross-screen refresh must not replay mutations or clear unsaved user input. Show a last-updated/stale indicator after refresh failure. |
| FR-025 | Clearly mark simulated identity, institutions and observations. A normal city ticket must never claim emergency responders were dispatched. Reported immediate danger is flagged for urgent human review with a direction to emergency services. |

## 4. Domain model and lifecycle

IDs are opaque stable identifiers; human references are unique display values. Times are stored in UTC and displayed with an explicit local timezone. An unknown time is null with an explicit `unknown` marker; it is not fabricated from submission time. Runtime validation applies to all external and model-produced values.

| Entity | Required information |
| --- | --- |
| Resident/session | Server identity, identity kind (`guest`/`demo_profile`), session expiry; no real government identity. |
| Intake draft | Owning identity, revision, current fields, stable submission key, confirmed revision/channel/time; unsubmitted draft is not a report. |
| Report | ID/reference, owner, channel (`voice`/`form`), category ID, issue type, English operator summary, restricted original observation, location and location source, observed/submitted times, scope, triage state, nullable incident ID, positive integer version (initially 1) and demo flag. |
| Incident | ID/reference, category and issue type, fixed matching anchor, public location/summary, scope, assessment, response status, version, institution assignment, evidence links, timestamps and provenance. |
| Contribution | Incident ID plus supporting identity and source; unique membership defines support. Several reports by the same identity remain separate observations without increasing that membership count. |
| Evidence | ID, incident/report link, kind, source reference, value/summary, observed/retrieved times, validity/freshness, demo flag and access scope. |
| Institution | ID/name, supported categories/issues, service area/asset rules, capabilities and allowed data scopes. |
| Action proposal | ID, incident ID/version, proposal version, institution, action type, immutable intended payload, evidence IDs, explanation, state, creator and decision metadata. |
| Service ticket | ID/reference, incident and proposal IDs, institution, copied approved payload, status, version, optional expected resolution time, timestamps and result note. |
| Audit event | Actor identity/role, operation, referenced entities, time, outcome, reason and correlation ID. No secrets or raw audio. |

### Report triage state

`pending` → `linked` or `needs_review`. An operator can move `needs_review` to `linked` after correction/selection, or to `private_issue` / `out_of_scope` with a reason and resident-visible next step. Failed processing leaves the report pending with a retryable error; it does not change the observation into a failed report.

An AI decision computed from report version 4 cannot change version 5. The command supplies `expected_version`; one database operation checks that version and increments it together with the accepted change. A conflict returns `409 version_conflict` with no partial mutation. Human callers refresh and review again; automated triage discards its stale suggestion and recomputes from current report and candidate state within its bounded retry policy.

### Incident assessment

- `suspected`: a validated observation exists, without sufficient corroboration.
- `corroborated`: at least two distinct reporting/contributing demo identities support it. This threshold is a demo rule, not proof of distinct real people.
- `verified`: an authorised official records a verification decision and evidence reference.
- `disputed`: an authorised official records conflicting information and a reason.

Automated support changes can update only `suspected` ↔ `corroborated`; they cannot overwrite `verified` or `disputed`. Corrections that affect a human assessment require review.

### Incident response and ticket status

| Event | Incident effect | Ticket effect |
| --- | --- | --- |
| Create case | `new` | None |
| Complete triage / choose responsibility | `triaged` | None |
| Approve proposal | No progress change until execution succeeds | None |
| Execute approved proposal | `assigned` | `created` |
| Institution acknowledges | Remains `assigned`; timeline says acknowledged | `acknowledged` |
| Institution starts work | `in_progress` | `in_progress` |
| Institution reports completion with note | `resolved` | `resolved` |
| Institution rejects before starting, with reason | `triaged`, review required | `rejected` |
| Official closes a resolved case | `closed` | Unchanged |
| Official reopens resolved/closed case with reason | `triaged`, fresh action review | Previous terminal ticket retained |

The only normal ticket transitions are `created` → `acknowledged` → `in_progress` → `resolved`, or `created`/`acknowledged` → `rejected`. No backward updates. A failed execution is an action failure, not a falsely created ticket. A new occurrence after resolution creates a new incident unless an official explicitly decides to reopen the earlier one.

Proposal transitions: `pending` → `approved` or `rejected`; `approved` → `executing` → `executed`, `failed` or `unknown`. An incident/payload change before execution marks a pending/approved proposal `superseded`. A retry after a known failure rechecks the approved version; an unknown outcome must be reconciled before any resend. Store transitions durably.

## 5. Matching, routing and publication policy

Automatic grouping is enabled only for the `power` category's `power_outage` issue type in the reference demo. Other issue types can be submitted, searched and manually triaged. The API supplies category IDs; never assume every `power` report describes an outage.

An incoming report is eligible for automatic linking only when all of the following hold:

1. Its location is confirmed, its observation time is known, and scope is `building` or `street`. Unit-only/unknown-scope reports go to review.
2. The candidate incident is active (`new`, `triaged`, `assigned`, `in_progress`), with matching category and issue type.
3. The report is within **300 metres of the incident's original confirmed anchor**, and its observed time is within **60 minutes of the incident's initial observation**. Boundaries are inclusive. Do not expand eligibility through chains of nearby reports.
4. Both records resolve to the same configured demo service area and either the same normalised street or the same known affected asset. Building-only reports require the same building asset; street-wide reports can match within their street. Unknown or conflicting location/asset facts require review.
5. Exactly one candidate satisfies those conditions and there is no contradictory scope or evidence flagged for review.

These limits are configurable demo defaults, recorded with each triage decision. Zero eligible candidates creates a new suspected incident only if the report has complete city-level facts and no unresolved plausible candidate; multiple candidates or incomplete facts require review. A decision-maker can suggest alternatives, but only a human may override eligibility, with a reason. There is no automated destructive merge or deletion of reports.

Qdrant retrieves and ranks candidates; the primary store also supplies recent spatial/time candidates so an indexing delay cannot make an existing case disappear from grouping. Re-read candidate state from the primary store before writing. If Qdrant is unavailable, preserve intake and mark semantic retrieval degraded; do not equate that failure with no related incident. Exact ID lookup uses the source record.

Responsibility lookup uses configured institution mappings, not geocoder output, LLM knowledge or company names mentioned by residents. A private-road or unknown-owner case remains reviewable. The demo provides a deterministic utility observation with explicit source and time. It never represents a real power feed.

Publish city-level incidents using controlled category/status templates and a confirmed public street/building location without unit details. Custom free-text public updates require official review. A map highlight denotes the report's location, not the measured boundary of an outage. Private reports and restricted evidence stay out of public search indexes/projections. Report volume is displayed as supporting evidence; severity remains independently reviewable.

## 6. Screens and permission boundaries

| Surface / role | Allowed | Denied |
| --- | --- | --- |
| Resident map and voice panel | Public incidents; own drafts/references; report and contribute; correct unsent summary | Other residents' reports; internal notes; verification; institutional dispatch |
| Official workspace | Triage/review queue; scoped reports/evidence; link correction; responsibility selection; proposal approval/rejection; verification and reopening | Silent changes to an executed payload; bypass of execution rules |
| Institution inbox | Assigned tickets and minimum required incident context; allowed progress transitions | Other institutions' tickets; reporter identities/transcripts; approving city proposals |
| Dispatcher agent | Location/public-incident lookup; own session draft/submission | Operator tools and service credentials |
| Decision-maker agent | Scoped search/evidence; triage proposals/eligible links; action proposal | Approval; arbitrary external requests; direct dispatch |
| Trusted executor | Valid approved action → one configured institution ticket | Choosing a new destination/payload or approving itself |

Institution responsibility, data permissions and capabilities are separate configuration fields. All boundaries apply to direct HTTP and MCP access, not just visible buttons. A report's narrative and retrieved text are untrusted content and cannot change these permissions or the agent's configured tools.

The resident voice panel shows listening/speaking/working states, transcript, confirmed location, editable summary and a clear saved reference. The official sees a queue plus incident details, evidence and a specific action card. The institution sees a compact inbox and status controls. All use existing Appica components and tokens; no additional design system.

## 7. Failures, privacy and persistence

| Situation | Required outcome |
| --- | --- |
| Microphone denied / voice unavailable | Explain the problem and offer the form; preserve entered information. |
| Address lookup ambiguous/unavailable | Ask for clarification or use the map pin; require confirmation before saving. |
| Voice interrupted or browser closed | Stop capture; committed records remain; pending save can be reconciled using the submission key. |
| AI unavailable | Save the report and expose pending triage to the official. Never claim AI review happened. |
| Missing/stale utility observation | Show its freshness/availability; no invented readings, outage cause or repair ETA. |
| Approval stale / write conflict | No effect; refresh current state and let the official review again. |
| Ticket execution timeout | Show unknown result; reconcile the stable execution key before retry. |
| Institution rejection | Preserve ticket/history and put the incident back in review. |
| Application restart | Reports, decisions, tickets and execution results survive; pending processing is recoverable. |
| Public refresh fails | Keep the last known view with a stale indicator; do not overwrite local drafts. |

Application storage retains structured reports, necessary evidence and audit events. Do not persist raw microphone audio or the full transcript by default. Keep original report narratives restricted and clear the transient transcript when the session view closes. Check ElevenLabs retention separately: not recording in the application does not imply the provider stores nothing. Use fictional personal data for the demo and record actual provider settings before rehearsal; no claim of production compliance is made.

## 8. Success criteria and verification

| ID | Manual completion criterion | Traceability |
| --- | --- | --- |
| SC-001 | Complete three scripted outage conversations, including an address correction, and obtain one saved report reference per intended submission. | US1; FR-001–006, FR-021–023 |
| SC-002 | Group those reports into one incident; keep a nearby water issue, street-light fault and apartment-only outage separate. Review ambiguous and boundary cases at 300 m / 60 min. | US2; FR-007–011 |
| SC-003 | Reject one proposal and verify zero tickets; approve another, repeat execution and verify exactly one ticket. Old-version approval cannot execute. | US3; FR-012–013, FR-018–019 |
| SC-004 | Complete institution acknowledgement, work started and resolution; public status updates within five seconds on active resident/operator screens. | US4–5; FR-014–017, FR-024 |
| SC-005 | Verify Water Services cannot read/update Electricity Operator tickets and the resident cannot call approval/execution, including through direct requests. | US3–4; FR-019–020 |
| SC-006 | Repeat affected contributions and linked reports from the same identity; the distinct-support count increases only once. It never triggers automatic verification. | US2, US5–6; FR-009, FR-016, FR-020 |
| SC-007 | Interrupt saving, fail voice/search/AI/observation/ticket calls, and restart the app. No saved reports or approvals disappear and no uncertain write is blindly duplicated. | US1–4; FR-005, FR-008, FR-011, FR-013, FR-021–024 |
| SC-008 | Inspect public payloads, map and search: no private narratives, resident/session IDs, unit details, secrets or raw transcript. Every fixture/integration is clearly labelled. | US5–6; FR-015, FR-017, FR-020, FR-025 |
| SC-009 | Run the flow with keyboard only and at 390 px / 1440 px widths in both themes; voice has a usable form fallback. | US1, US5; FR-001, FR-022–023 |
| SC-010 | Show keyword/paraphrase search for Polish observations, uncategorized records, scoped results and updated/deleted source records per the Qdrant guide. | US2–3; FR-007, FR-019 |
| SC-011 | Demonstrate the labelled identity mock and guest flow without collecting government credentials or granting staff rights. | US6; FR-020 |

Run available lint, type check and build for implementation changes; record manual outcomes and actual voice/search/status latency. No provider capability, latency, completed integration or acceptance case is verified merely by writing this specification.

## 9. Dependencies and later planning

Before live implementation verification, the team needs an ElevenLabs account with a configured agent and voice, a deployed backend with session handling, a persistent primary store, Qdrant access and the fixture data. Exact account limits, selected voice/model, deployment owner and retention settings are setup inputs. They do not reopen the choice of ElevenLabs.

The foundation uses PostgreSQL for identities and sessions; the response workflow will extend that store. Polling remains the planned refresh mechanism. The backend reasoning model is selected during implementation from available team access and recorded with its prompt/version; it does not change the report, permission or approval contracts. No cloud resource or paid service has been provisioned by this specification.

Spec Kit handoff: use this file for requirements/clarification, [plan.md](plan.md) for the technical plan, and derive dependency-ordered tasks for its delivery slices. Preserve the existing no-tests-unless-requested and branch/PR policies when generating tasks. The remaining setup inputs above must be resolved before their dependent integration is claimed complete.

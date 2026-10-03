# Frontend–backend contract

Status: shared frontend–backend contract, 2026-10-03. It distinguishes **implemented foundation** (persistent authentication and health APIs), **implemented demo** (the in-memory Next.js report routes), **specified PoC** ([voice and incident response](../specs/001-voice-incident-response/spec.md) and its [technical plan](../specs/001-voice-incident-response/plan.md)), and **future platform** ([root SPEC](../spec.md)). The feature specification is authoritative for the next slice wherever it differs from the root platform vision; future-platform tables below are not PoC requirements. Update this file with both teams whenever a slice changes its wire format or behavior.

Exact payloads, error codes, official command paths, the transactional work interface, search-source projections and the two-stage legacy migration for the specified PoC are in the [shared workflow contracts](workflow-contracts.md). That file is the integration baseline for the three workstreams and takes precedence over the summaries below where it is more specific; it does not make any specified route implemented.

ElevenLabs Agents is the selected browser-voice provider, and Qdrant is the selected derived search index ([D029 guide](knowledge-base/qdrant-search.md)). Neither integration has been implemented or verified. The older [discovery draft](plans/2026-10-03-voice-incident-design.md) is background research, not a competing feature specification.

## Scope and vocabulary

The next PoC covers a resident map and voice/form intake, official review, one demo institution ticket per incident and public feedback. Electricity Operator and Water Services are visibly fictional demo institutions; only Electricity handles the reference outage. The [selected citizen use cases](knowledge-base/citizen-use-cases.md) supply four fictional intake/rehearsal inputs—broken lift (UC-005), pothole (UC-003), blocked drain (UC-002) and power outage (UC-001)—without expanding automatic grouping beyond the specified power-outage policy. The later platform extends this with contractors, finance, multi-city administration, external ingestion and open data. The foundation persists identities and sessions in PostgreSQL. The incident workflow and its polling are still planned; no Scaleway deployment is delivered by the local foundation.

| Term | Meaning |
| --- | --- |
| City | Top-level data and configuration boundary. The PoC has one city, Kraków; the target platform can host more. |
| Tenant | A city department, external contractor or city administration group within one city. A tenant's identity and access scope come from the authenticated actor, not a client-supplied filter. |
| Report | One resident observation, owned by its submitting identity and separate from the operational case. Detailed reports are private to their owner and authorized staff in the specified PoC. |
| Incident | The operational case grouping related reports, with assessment separate from response progress. Public map, search and counts move from reports to an allowlisted incident projection. |
| Service ticket | The approved request to one demo institution in the specified PoC; distinct from both report and incident. |
| Work order | Future-platform assignment to a pre-contracted firm under a contract; not part of the first PoC. |
| Evidence / observation | Timestamped resident, operator or fixture information with source, freshness and demo/live provenance. Missing data is not a zero reading or verification. |

The existing map still consumes public reports. The specified migration switches the map, nearby list, search, counts, heatmap and contribution action together to public incidents. A report can remain unlinked while triage or scope review runs. Do not equate the root SPEC's illustrative ticket/incident record with a resident report or with an institution service ticket.

## Common wire rules

- JSON property names use `snake_case`. IDs are opaque nonempty strings; clients must not infer meaning from their format. Timestamps are ISO 8601 strings with a UTC offset; the backend emits UTC. Coordinates are WGS84 decimal `lat` and `lng`, with GeoJSON coordinates in `[lng, lat]` order.
- The implemented foundation and specified PoC return success as `{ "data": ..., "version"?: number, "correlation_id": string }`. A collection places `{ "items": [...], "next_cursor": string | null }` inside `data`. Failure uses an HTTP status and `{ "code": string, "message": string, "retryable": boolean, "correlation_id": string }`; use 400/401/403/404/409/429/500/503 as appropriate. `version_conflict`, `not_confirmed`, `stale_approval`, `dependency_unavailable` and `execution_unknown` need distinct codes in the workflow. The existing map demo instead has route-specific success envelopes and `{ "error": string }`; its client and handlers change together during migration.
- A retryable write is idempotent for the same authenticated identity, operation and key; the same key with a different payload returns `409`. The specified report submission key belongs to the server-owned draft, not an arbitrary replacement supplied by an agent. Ticket execution uses the persisted proposal/execution key and reconciles an unknown outcome before retrying. Existing demo handlers do not enforce this.
- The specified PoC issues a guest identity server-side or uses a clearly labelled fictional resident profile. Staff and institution sessions are separately provisioned server-side; a public role switch cannot grant them. The backend derives actor, city and institution scope from the session. Cookie-based writes need origin/CSRF checks. Provider keys and privileged service credentials never go to the browser. SAML/OIDC, native MFA and multi-tenant service credentials in the root SPEC are future-platform requirements, not PoC authentication claims.
- Public incident projections exclude resident/session IDs, apartment details, original private narratives, raw/full voice transcript, restricted evidence, notes and financial data. Every demo institution or observation is explicitly labelled; do not mix demo and live records without provenance.

## Access roles

For the specified PoC, a resident/dispatcher voice client can access only its own draft/report and public incidents. A decision-maker agent may read scoped evidence, suggest eligible triage and create proposals; it cannot approve or execute. An official can review, classify, correct links, verify, approve/reject and reopen through authenticated commands. An institution operator can read/update only tickets assigned to its institution. A trusted executor can execute an approved immutable proposal but cannot choose a new destination or payload. The same checks apply to direct HTTP, ElevenLabs client tools and the scoped MCP adapter; tool visibility or a model-generated role field grants nothing.

The following role catalogue belongs to the **future platform** and does not imply that its administration, contractor or finance capabilities are part of the specified PoC:

| Role | Read scope | Allowed actions |
| --- | --- | --- |
| `platform_admin` | Platform configuration; city data only with an explicit support grant | Create city tenants and configure platform-level identity/integration settings. |
| `city_admin` | All tenants in own city | Configure city, categories, zones, responsibilities, users and integrations; view city audit data. |
| `department_admin` | Own department and explicitly shared incidents | Manage own staff and incidents; assign work within permitted responsibilities. |
| `dispatcher` | Own department and assigned incidents | Triage, assign, update priority within policy and dispatch permitted contractors. |
| `supervisor` | Own department and assigned incidents | Override priority, escalate and approve contractor dispatch or acceptance. |
| `field_inspector` | Assigned categories/zones/incidents | Update work, add notes and evidence, propose resolution. |
| `contractor_user` | Work orders assigned to own contractor tenant | Update assigned work orders and submit completion evidence only. |
| `incident_commander` | Incidents linked to an authorized emergency | Coordinate participating tenants and emergency status. |
| `finance_officer` | Finance references for authorized city or tenant scope | Review costs, invoice references and reserve-budget reports; no payment execution. |
| `auditor` | Authorized city or tenant scope | Read incidents, history and audit records; no operational writes. |

Permissions are enforced per resource and action, including nested resources. Cross-tenant visibility requires an explicit assignment, sharing relation or city-level role. Future-platform role identifiers are illustrative; the identity provider and exact grants remain city configuration. The PoC's dispatcher agent is not the platform's staff `dispatcher` role.

## Shared data shapes

### City configuration (future platform, except public categories)

| Object | Required response fields | Optional/configurable fields |
| --- | --- | --- |
| `City` | `id`, `name`, `timezone`, `active` | Boundary geometry, public contact and retention settings. |
| `Tenant` | `id`, `city_id`, `kind` (`department`, `contractor`, `administration`), `name`, `active` | `parent_tenant_id`, external reference, public contact. |
| `Membership` | `user_id`, `tenant_id`, `roles[]`, `active` | Allowed `category_ids[]`, `zone_ids[]`; these further restrict, never expand, role permissions. |
| `Category` | `id`, `label`, `description`, `active` | Base severity/priority, SLA rule references and localized labels. Public `CategoryPublic` is exactly `id`, `label`, `description`; `id` matches `^[a-z][a-z0-9-]*$`. |
| `Zone` | `id`, `city_id`, `name`, GeoJSON `Polygon` or `MultiPolygon` geometry | External GIS identifier and effective dates. |
| `Responsibility` | `id`, `city_id`, `category_id`, `tenant_id`, `priority_order`, `active` | `zone_id`; absent zone means city-wide coverage. An overlap has one lead by `priority_order` and may have supporting tenants. No match leaves the incident `unassigned`. |
| `Contract` | `id`, `city_id`, `contractor_tenant_id`, `reference`, `active`, `category_ids[]`, `zone_ids[]` | SLA rules, billing terms and validity dates; the system references a procurement contract rather than conducting a tender. |

The city administration UI manages these objects. Imports may create drafts, but changes become live only after validation and an explicit commit. Routing uses the category and the report's coordinates against active responsibilities; an authorized dispatcher can correct the result with an audited action.

### Resident report: existing demo shape to migrate

`GET /api/reports` currently returns `{ "source": "demo" | "live", "reports": LegacyReport[] }`. The current code accepts any string for `source` and emits `demo`. The legacy confirmation route returns one `LegacyReport` directly. The resident form now submits owned confirmed drafts through the common envelope; private persisted reports never enter the old public feed. The map fetches categories first and discards a legacy report whose category or required fields are invalid. The legacy read/contribution contracts remain a migration baseline until MAP.

| Field | Required | Meaning and source |
| --- | --- | --- |
| `id`, `reference` | Yes | Backend-generated unique ID and human-facing reference. The exact reference format is not a client contract. |
| `category_id`, `title`, `description` | Yes | Resident input or a verified city notice. `description` may be an empty string. Every report has exactly one category returned by the city API. |
| `severity` | Yes | `low`, `medium` or `high`; currently resident-selected. It is not the staff incident priority. |
| `status` | Yes | Current-demo `reported`, `confirmed`, `in_progress` or `resolved`; these are not the specified incident states. |
| `source` | Yes | `resident` or `city`. `city` exists in demo fixtures; a live value would require a trusted city publisher, not a self-selected form value. |
| `reported_at`, `updated_at` | Yes | Backend timestamps for creation and last accepted change. |
| `lat`, `lng` | Yes | Map pin. The current create route restricts them to `49.96 <= lat <= 50.13` and `19.79 <= lng <= 20.22`; a multi-city backend must validate against the configured city boundary instead. |
| `address` | Yes | Human-readable location. The current UI uses Photon reverse geocoding and falls back to `Pinned location (no street address)`; coordinates remain authoritative. |
| `district` | No | Reverse geocoder result or official city zone lookup. Omit if unknown. |
| `confirmations` | Yes | Nonnegative count, starting at one for the reporter in the current demo. It is an action count, not distinct-resident support. |
| `responsible`, `expected_fix_at`, `affected` | No | Verified assignment, promised/estimated repair time and plain-language impact. Omit until a staff action or trusted source supplies them. Never manufacture them from category or geolocation. |

The former raw-create `POST /api/reports` payload is retired with `400 legacy_contract_retired`. The canonical payload is `{ draft_id, revision }` through the shared authenticated submission service. The form preserves title (3–80) and original-observation (0–1000) limits. See [shared intake contracts](workflow-contracts.md#3-resident-intake) and [location/form behavior](location-resolution.md).

Current-demo `POST /api/reports/{id}/confirmations` has no JSON body and returns the updated `LegacyReport` with `200`. It returns `404` if the report is absent and `409` if resolved. It increments the count on every accepted request and changes `reported` to `confirmed` at three confirmations. The browser's local storage suppresses repeat clicks only in that browser; it does not enforce one person/one confirmation. Confirmation alone is not proof of dispatch to a city service.

### Specified PoC data shapes

The API exposes separate projections of source records. Nullable values are explicit; an unknown observation time is `null` with `observed_time_state: "unknown"`, never silently replaced with submission time. The backend validates external and model-produced values.

| Object | Required fields / boundary |
| --- | --- |
| `ResidentSession` | Foundation `Session` response below, with resident identity at `actor.id` and `identity_kind: "guest"`. Optional fictional `demo_profile` identity is a future extension; resident identity never grants staff rights. |
| `IntakeDraft` | `id`, owner, `revision`, stable `submission_key`, current location/category/issue/description/time/scope fields and `confirmed_revision`, `confirmation_channel`, `confirmed_at` when confirmed. Any edit invalidates confirmation. A committed draft is immutable and points to its report. |
| `Report` (owner/official only) | `id`, `reference`, owner, `channel` (`voice` or `form`), API-defined `category_id`, `issue_type`, English operator summary, restricted original observation, confirmed location and source, `observed_at` plus `observed_time_state`, `submitted_at`, scope (`unit`, `building`, `street`, `unknown`), `triage_state`, nullable `incident_id`, positive integer `version` (initially 1), demo provenance. It has at most one current incident link and is not a public map card. |
| `Incident` (official detail) | `id`, `reference`, `category_id`, `issue_type`, fixed matching anchor, public location/summary, scope, `assessment`, `response_status`, `version`, assigned institution if any, linked report/evidence IDs, timestamps and provenance. A material change increments `version`. |
| `PublicIncident` | Allowlisted `id`, `reference`, `category_id`, `issue_type`, `public_summary`, `assessment`, `response_status`, `support_count`, `public_location`, `created_at`, `updated_at`, `timeline[]` and `provenance` (`demo` or `live`). Excludes raw report text, identities, apartment details, transcripts and unreviewed generated text. A unit-only/unreviewed-private report has no public incident card. |
| `Contribution` | Unique `(incident_id, resident_id)` membership with source. `support_count` is the union of linked report owners and explicit contributions, not a sum of clicks; demo guests are labelled unverified. |
| `Evidence` | `id`, linked report/incident, kind, source reference, observation/retrieval times, validity/freshness, demo/live marker and access scope. Unknown or unavailable observation is explicit. |
| `Institution` | `id`, fictional demo name, supported categories/issues, service area/asset rules, capabilities and permitted data scope. Responsibility, permission and capability are separate. |
| `ActionProposal` | `id`, `incident_id`, `incident_version`, proposal `version`, institution, action type, immutable payload, evidence IDs, rationale, creator, status (`pending`, `approved`, `rejected`, `executing`, `executed`, `failed`, `unknown`, `superseded`) and decision metadata. Approval binds the exact versions/destination/payload. |
| `ServiceTicket` | `id`, `reference`, incident/proposal/institution IDs, copied approved payload, `version`, status (`created`, `acknowledged`, `in_progress`, `resolved`, `rejected`), timestamps and result note. At most one nonterminal ticket per incident and one ticket per proposal. |
| `AuditEvent` | Actor identity/role, operation, entity IDs, time, result, reason and correlation ID. Public history is a separate redacted projection; no secrets or raw audio. |

`Report.triage_state` is `pending`, `linked`, `needs_review`, `private_issue` or `out_of_scope`. A failed search/AI step leaves the persisted report pending or reviewable, not lost. Correcting a link preserves the original report and an audited reason. A candidate match score is ranking information, not a confidence probability or permission to merge.

Every future report mutation includes `expected_version`. The database applies the update and increments `version` atomically only when both report ID and expected version match. A stale version returns `409` with `code: "version_conflict"` and no partial change; the caller retrieves its authorized current record before retrying. An official reviews again; AI triage discards its earlier suggestion and recomputes from current report/candidate state. This rule is specified for the report implementation, not added to the unchanged in-memory `LegacyReport` routes.

`PublicIncident.public_location` is `{ "lat": number, "lng": number, "label": string, "precision": "street" | "building" }` with no unit number; the backend may coarsen coordinates before publishing. Each `timeline[]` item is `{ "id": string, "kind": string, "occurred_at": string, "text": string }` after publication review. The public response supplies all fields needed for map pins, nearby distance, category counts, detail/timeline and status display; the frontend derives heat weight only from permitted incident assessment/support data and labels it reported impact. No client should reconstruct a private report from that projection.

### Future-platform extensions

The root SPEC later adds multi-tenant priority (`low`/`medium`/`high`/`critical`), priority score/reasons, lead/supporting tenants, staff assignees, SLAs, notes, tasks, attachments, emergency coordination, contractor work orders, estimates/actual costs, budget lines, invoice references, notifications and audit exports. These fields and objects must not become required in the specified PoC `Incident` or `ServiceTicket` DTOs. Payment execution stays in the city's ERP.

| Future object | Minimum fields / boundary |
| --- | --- |
| `WorkOrder` | `id`, `incident_id`, `contract_id`, `contractor_tenant_id`, `status` (`offered`, `accepted`, `scheduled`, `in_progress`, `completed`, `accepted_by_city`, `rejected`, `cancelled`), `version`, timestamps, due/schedule, completion evidence and cost references. It never grants access to unrelated reports. |
| `Task` / `Note` | Task: `id`, `incident_id`, title, assignee, status and dates. Note: `id`, `incident_id`, text, author, visibility (`internal` or explicitly approved `public`) and timestamp. |
| `Attachment` / `Observation` | Attachment: owner, type, size and access-checked download. Observation: source system/external ID, kind, observed time, location, values, validity and provenance. |
| `StatusEvent` / `Notification` | Audited from/to status and actor/time; user-scoped alert with kind, related case and read time. Public history remains a separate redacted projection. |

Financial amounts, when implemented, use decimal strings and ISO currency codes; clients must not total them with binary floating-point values.

## Lifecycle and public projection

| Event | Incident response | Institution ticket |
| --- | --- | --- |
| Case created / triaged | `new` → `triaged` | None. |
| Proposal approved | No response-progress change. | None until execution succeeds. |
| Approved proposal executed | `assigned` | `created`. |
| Institution acknowledges | Remains `assigned`; timeline notes acknowledgement. | `acknowledged`. |
| Institution starts work | `in_progress` | `in_progress`. |
| Institution reports completion with note | `resolved` | `resolved`. |
| Institution rejects before work | Back to `triaged` and official review. | `rejected`. |
| Official closes or reopens | `resolved` → `closed`, or `resolved`/`closed` → `triaged` with reason and fresh action review. | Prior terminal ticket retained. |

Incident assessment is independent: `suspected` ↔ `corroborated` can change automatically from distinct demo identities (two support identities is the demo threshold), but only an authorized official with evidence may set `verified` or `disputed`. A ticket acknowledgement is not work started; an institution's resolution report is a progress event, not automatic official verification. Repeated support from one identity counts once. Closed/resolved cases reject new contributions, and new reports are evaluated as possible recurrences rather than silently added to a terminal case.

Only `created` → `acknowledged` → `in_progress` → `resolved`, or `created`/`acknowledged` → `rejected`, are ordinary ticket transitions. Proposal transitions are `pending` → `approved`/`rejected`; then `approved` → `executing` → `executed`/`failed`/`unknown`. Material incident changes supersede unexecuted proposals. Repeated execution returns the existing ticket; an unknown result must be reconciled by key before resend. A rejected ticket returns the incident to review, not to another automatically selected institution.

The current demo's `confirmed` report status is just three raw confirmation actions; it is neither distinct-person corroboration nor city dispatch. That behavior and its misleading copy are retired with the incident-map migration. The root SPEC's emergency, contractor acceptance, SLA and finance states belong to future platform extensions, not this PoC lifecycle. Reported immediate danger gets urgent human review and direction to emergency services, never a false claim of emergency dispatch.

## HTTP operations by surface

Only routes marked **implemented foundation** or **implemented demo** exist today. **Specified PoC** routes follow the feature specification and plan but have not been built. **Future platform** routes represent the root SPEC, not the next sprint. Namespaced official and institution routes prevent `/api/incidents` from meaning both a public card and private staff detail. The backend uses Next route handlers; browser-visible contracts must change atomically with their callers.

### Backend foundation (implemented)

All routes in this section use the common envelopes and return `Cache-Control: no-store`. `Actor` is `{ "id": string, "role": "resident" | "official" | "institution", "identity_kind": "guest" | "demo_staff", "institution_id": string | null }`. A `Session` is `{ "actor": Actor, "expires_at": string }`. These are application identities, not verified government identities. The server supplies the role and institution from persisted data; no request can choose them.

| Operation | Request / success response (`data`) | Behavior |
| --- | --- | --- |
| `POST /api/auth/guest` | No body; `201 Session` for a new guest, `200 Session` for the current guest. | Creates an anonymous resident identity and session or recovers the valid existing resident session. A valid staff session receives `409 session_role_conflict`; sign out before switching to guest. |
| `GET /api/auth/session` | `200 Session`. | Returns the current identity and expiry. Missing, expired or revoked session: `401 unauthenticated`. |
| `POST /api/auth/login` | Exactly `{ "username": string, "password": string }`; `200 Session`. | Username is trimmed/lowercased, nonempty and at most 64 characters; password is 1–256 characters. Valid credentials create a new staff session and revoke the previous cookie session. Invalid credentials: `401 invalid_credentials`. |
| `POST /api/auth/logout` | No body; `200 { "signed_out": true }`. | Revokes the current session and clears its cookie. Repeating logout succeeds. |
| `GET /api/operations/me` | `200 { "actor": Actor }`. | Requires an official session. This is an access-check endpoint, not an implemented review queue. |
| `GET /api/institution/me` | `200 { "actor": Actor, "institution": { "id": string, "name": string, "is_demo": true } }`. | Requires an institution session; institution comes from the account, never a query parameter. No ticket API is implemented yet. |
| `GET /api/health/live` | `200 { "status": "ok" }`. | Confirms the application can answer a request; does not require a database connection. |
| `GET /api/health/ready` | `200 { "status": "ready" }`. | Checks PostgreSQL connectivity, required authentication tables and the applied initial migration. Unavailable/unmigrated database: `503 dependency_unavailable`. Does not certify pending voice/search integrations. |

All authentication `POST` requests require an `Origin` header exactly matching configured `APP_ORIGIN`; an absent or different origin returns `403 invalid_origin`. Browser requests send it automatically; command-line examples must include it. Login requires `Content-Type: application/json`, accepts at most 4,096 body bytes and rejects additional fields such as `role` or `institution_id`. Malformed JSON returns `400 invalid_json`; invalid content type, body size or login fields return `400 invalid_request`. Protected reads return `401 unauthenticated` without a session or `403 forbidden` for the wrong role. Unexpected server failures return a safe `500 internal_error`, never database details or credentials.

The `smart_city_session` cookie is opaque, `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` when `APP_ORIGIN` uses HTTPS. PostgreSQL stores only a SHA-256 hash of the random session token. New guest and staff sessions expire 30 days after creation. This is a fixed lifetime, not a sliding timeout: reading or recovering a session does not extend it. Existing sessions retain their stored expiry; a new staff login issues a 30-day session. A reload or application restart keeps an unexpired session when the cookie and database persist. Signing out, clearing the cookie or expiry ends guest recovery; a subsequent bootstrap creates a new guest identity. Staff can sign in again with their configured account. There is no resident account recovery or simulated government-profile UI in this slice.

The fictional seed accounts are `official`, `electricity` and `water`; their passwords come from ignored local environment configuration, with startup instructions in the [README](../README.md#running). Institution IDs are `demo-electricity` and `demo-water`. After five failed logins per normalized username within a fifteen-minute window, further attempts return `429 rate_limited` with `Retry-After` until that window expires; attempts are tracked in PostgreSQL. These accounts support a closed demo, not public staff enrollment.

The old map/report routes below remain public, in-memory demo endpoints. Authentication does not silently give those fixtures persistence or report ownership. New incident/report work must use this session boundary and migrate its callers together.

### Resident and public data

| Operation | Request / success response | State |
| --- | --- | --- |
| `GET /api/categories` | Current `200 { categories: CategoryPublic[] }`; specified PoC moves the same list into the common `data` envelope while keeping API-defined IDs stable. | Implemented demo; response-envelope migration in PoC. |
| `GET /api/reports` | `200 { source, reports: LegacyReport[] }`; public raw-report list for the current map only. | Implemented demo; retire after all map callers move to incidents. |
| `POST /api/reports` (former raw-create body) | `400 legacy_contract_retired`. | Retired in CITIZEN; reload and use a confirmed owned draft. |
| `POST /api/reports/{id}/confirmations` | Empty body; increments raw count, `404` absent or `409` resolved. | Implemented demo; retire in favor of incident contributions. |
| `POST /api/voice/sessions` | For the authenticated resident, return our session ID and a short-lived conversation credential for the server-configured private ElevenLabs dispatcher agent, never the API key. | Specified PoC. |
| `POST /api/report-drafts` / `PATCH /api/report-drafts/{id}` | Create/update an owned draft; update includes expected revision and returns new revision, missing fields and readback summary. | Implemented (persistent); citizen form uses it; voice integration remains pending. |
| `GET /api/report-drafts/{id}` | Recover own draft, confirmation state and committed report reference, including after a lost submit response. | Implemented (persistent). |
| `POST /api/report-drafts/{id}/confirmation` | Confirm the exact current revision by spoken agreement or button; return confirmation record. An edit invalidates it. | Implemented (persistent). |
| `POST /api/reports` | `{ draft_id, revision }`; server checks owner, confirmed revision, required category/issue/description/location and draft submission key; `201` or replay of the same persisted `Report` ID/reference and triage state. Same key with changed payload is `409`. | Implemented canonical form submission; raw-create compatibility is retired. Saving returns a committed report, initially pending triage. |
| `GET /api/reports/{id}` | Owner or authorized official receives its permitted private report projection, including triage state; others get `404` without disclosure. | Implemented (persistent), **not** a public report endpoint. |
| `GET /api/issue-types` | `200 { items: [{ id, category_id, label }] }` in the common envelope; `category_id: null` fits every category. | Implemented; demo configuration. |
| `GET /api/incidents` / `GET /api/incidents/{id}` | Public, paginated `PublicIncident` cards and timeline; list filters include `bbox`, `category_id`, `assessment`, `response_status`, `limit` and `cursor`. Map/search/nearby/counts/heatmap use these records. | Implemented (persistent); private/unit-only reports are absent. The resident map switches to it in the MAP cutover. |
| `POST /api/incidents/{id}/contributions` | Add current resident's affected membership once; repeated request returns existing membership/count, no duplicate. Reject resolved/closed incidents. | Implemented (persistent). |

ElevenLabs client tools call the same owned-draft/report/location/public-incident API as the form. The browser adapter uses `@elevenlabs/react` and a WebRTC conversation token from our backend, not a browser-visible provider key or WebSocket signed URL. The backend chooses the agent and validates every tool input; tools that depend on a result, especially submission, wait for the server response. No recording starts before user action and permission. Ending voice, switching to the form or disconnecting stops capture and preserves the draft/key. A success announcement requires a persisted report reference. Show a transient transcript and editable structured summary, but do not persist raw audio or the full transcript by default; provider-side retention must be checked separately. The reference demo's authored prompt and responses are English while accepting Polish observations and place names as input. The plan's closed-demo session limits are one active session per identity, five starts per ten minutes and five minutes per session; provider cleanup and account limits still require implementation verification.

Photon remains an external place-search/reverse-geocoding dependency; a spoken address or pin must be confirmed and ambiguous lookup stays unresolved. The new public map highlights reported locations, not a measured outage boundary. Active screens aim for a five-second update target using the plan's three-second visible-tab polling; preserve last-known data with a stale indicator on failure and never clear an unsaved draft. This is a target, not measured performance.

### Official, institution and agent surfaces (specified PoC)

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `GET /api/operations/review` / `GET /api/operations/incidents/{id}` | Review queue / private incident detail with linked reports, evidence, proposals, history, current version and retryable processing state. | Separately provisioned official/staff session only. |
| Official triage, classification, verification and reopen commands under `/api/operations/` | Explicit report/incident ID, expected version, decision, evidence IDs and reason; return updated record and audit reference. Exact subpaths, required versions and reasons are fixed in the [shared workflow contracts](workflow-contracts.md#5-official-commands). | Human-authenticated commands only; no resident or dispatcher-agent tool can invoke them. |
| `POST /api/action-proposals/{id}/decision` | `{ decision: "approved" | "rejected", reason?, expected_proposal_version, expected_incident_version }`; return durable proposal decision. | Authorized official only. Material incident/payload changes supersede pending approval; stale versions return `409 stale_approval`. Rejection creates no ticket. |
| `GET /api/institution/tickets` / `PATCH /api/institution/tickets/{id}` | Scoped inbox / `{ status, note?, expected_version }`; return current ticket and version. | Institution session inferred server-side; only assigned tickets and legal transitions, including reasoned rejection. |
| `GET /api/search/records` | Query or related source `{ record_type, record_id }`, `keyword`/`semantic`/`hybrid` mode, explicit filters and bounded cursor; scoped hits with `record_type` (`report`, `incident`, `service_ticket`), source `record_id`, title, score, safe excerpt, nullable `category_id` and index freshness. | All three kinds are indexed through permitted text projections. Qdrant ranks; primary store hydrates and rechecks current permissions/deletion/version. Public callers receive public incident projections only. Unavailable/stale index is distinct from zero hits; scores do not authorize grouping. |
| `POST /api/mcp` | Streamable HTTP tool surface for bounded decision-maker/institution tools. | Scoped server credentials; same domain validation as HTTP. No provider/MCP approval prompt substitutes for official approval. |

**Official workspace demo (implemented, in-memory).** The `/operations` screen runs against mock handlers with these shapes; each answers with the whole workspace `{ data: { source: "demo", generated_at, institutions, incidents, reports } }` (types in `apps/frontend/src/api/operations/types.ts`). There is **no staff session check yet** — the persistent slice must add the official session, origin check and audit storage before real data.

| Operation | Body | Behaviour |
| --- | --- | --- |
| `GET /api/operations/review` | — | Incidents (with evidence, proposal, ticket, history, version), reports visible to staff (including unit detail and review candidates) and institutions. Demo shortcut for the queue and incident detail. |
| `POST /api/action-proposals/{id}/decision` | `{ decision: "approved" \| "rejected", reason?, expected_proposal_version, expected_incident_version }` | As specified above. Approval executes immediately through a demo connector (one ticket; a repeat returns it); rejection creates none. `409 version_conflict` / `proposal_closed`. |
| `POST /api/operations/incidents/{id}/commands` | `{ type: "choose_institution" \| "verify" \| "dispute" \| "close" \| "reopen", expected_version, institution_id?, reason? }` | Choosing an institution creates a pending proposal (never a ticket). Verify, dispute and reopen need a reason; close needs a resolved incident. |
| `POST /api/operations/reports/{id}/triage` | `{ decision: "link" \| "new_incident" \| "private_issue" \| "out_of_scope", expected_version, incident_id?, reason? }` | Linking adds support and evidence and supersedes an unexecuted proposal with a fresh agent proposal. Private and out of scope need a resident-facing reason. |

The dispatcher client tools are `resolve_location`, `find_incidents`, `prepare_report`, `confirm_report_draft` and `submit_report`; they call same-origin resident APIs under the current session. The decision-maker's scoped tools are `search_tickets`, `find_related_tickets`, `get_incident_context`, `triage_report`, `resolve_responsibility`, `get_service_observations` and `propose_action`. The trusted executor alone runs `create_service_ticket` after official approval and version checks; `get_service_ticket`/`update_service_ticket` are scoped to the assigned institution. Actor context is injected by the authenticated adapter, never accepted from model-generated fields. The executor is a server-side operation, not a public `POST /execute` endpoint.

Automatic linking in this demo applies only to `power`/`power_outage` with a confirmed building/street location, known observation time, one eligible active incident within 300 m of its fixed anchor and 60 minutes of its initial observation, the same configured service area and matching normalized street or known affected asset, and no contradictory evidence. Building-only reports require the same building asset; street reports require the same street. Limits are inclusive and configurable, never extended through a chain of nearby reports. Zero eligible candidates creates a new suspected case only with complete city-level facts and no unresolved plausible candidate; unit-only/unknown scope, multiple candidates and uncertain responsibility go to review. Qdrant retrieval does not replace recent candidates from the source store or the transaction/version check before writing. Reports persist even if search or AI is unavailable; one in-flight triage attempt per report and at most two transient retries are planning defaults before human review.

### Municipal staff and dashboards (future platform)

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `GET /api/operations/me` extension | Foundation returns an official actor; future platform can add city, memberships and permissions. | Staff UI hints only; server rechecks every action. These extra fields are not in the implemented response. |
| `GET /api/operations/incidents` / `GET /api/operations/incidents/{id}` | Paginated scoped incidents / private detail, with future priority, zone, due-date and assignee filters. | Authorized city/tenant/assigned cases only. |
| `PATCH /api/operations/incidents/{id}` / `POST /api/operations/incidents/{id}/status-events` | Explicit editable fields or validated lifecycle transition with expected version and audit entry. | Dispatcher/supervisor per permission; never the root SPEC's illustrative unrestricted `PUT`. |
| `GET /api/operations/incidents/{id}/duplicate-candidates` / `POST /api/operations/incidents/{id}/report-links` | Suggested matches; audited link/relink decisions. | Authorized triage; no automatic destructive merge. |
| `GET/POST /api/operations/incidents/{id}/notes` / `GET/POST /api/operations/incidents/{id}/tasks` | Internal/public notes and assigned subtasks. | Staff scope; public notes require publication permission. |
| `POST /api/operations/incidents/{id}/related-incidents` / `POST /api/operations/incidents/{id}/observations` | Link related cases or evidence with reason and audit entry. | Cross-tenant sharing explicit; telemetry remains evidence. |
| `POST /api/operations/incidents/bulk-actions` / `GET /api/operations/incidents/{id}/history` | Per-item success/error for scoped bulk changes / permission-filtered history. | Check role and version per case. |
| `POST /api/attachments` / `GET /api/attachments/{id}` | Controlled upload/download of evidence after owner and type/size validation. | No private file as a public URL. |
| `GET /api/dashboard/summary` / `GET /api/notifications` | Scoped counts, SLAs, escalations and user notifications. | Staff scope; email/SMS delivery is a backend effect. |

### Contractors and finance references (future platform)

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `POST /api/operations/incidents/{id}/work-orders` | `{ contract_id, contractor_tenant_id, due_at?, scope, estimated_cost? }`; return `WorkOrder`. | Supervisor/dispatcher with dispatch permission; contract must cover category, zone and date. Distinct from the PoC service ticket. |
| `GET /api/work-orders` / `GET /api/work-orders/{id}` | Paginated assigned work orders / one work order with permitted incident summary. | Contractor sees only own assignments; city staff see cases in scope. |
| `POST /api/work-orders/{id}/updates` | `{ status, note?, scheduled_at?, attachment_ids?, expected_version }`; `200 WorkOrder`. | Assigned contractor or city worker; allowed statuses include `accepted`, `scheduled`, `in_progress`, `completed`. |
| `POST /api/work-orders/{id}/acceptance` | `{ decision: "accepted" | "rejected", note?, actual_cost?, invoice_reference?, expected_version }`; `200 WorkOrder`. | Authorized city inspector/supervisor. Invoice number and cost are references for finance; payment remains in the city's ERP. |
| `GET /api/finance/incident-costs` | Scoped export/list of estimates, actual costs, budget line, reserve flag, invoice references and overdue-payment flags based on configured terms. | Finance-authorized staff only. |

Financial amounts in JSON are decimal strings plus ISO currency codes; clients must not use binary floating-point values for totals. SLA and invoice deadlines come from configured contracts and finance records, not a universal number of days.

### Public open data (future platform)

| Operation | Request / success response | Boundary |
| --- | --- | --- |
| `GET /api/open/incidents` | Paginated anonymized `PublicIncident` records by district/category/date; JSON or CSV of the same permitted columns. | Apply location coarsening and privacy policy; distinct from the PoC map feed. |
| `GET /api/open/metrics` | Aggregated counts by period, category and district. | No resident identity or internal notes. |
| `POST /api/reports/{id}/attachments` | Controlled photo/document upload by the report owner or authorized staff; return public-safe metadata. | Requires session ownership, size/type checks and separately permissioned download. |

### City configuration and onboarding (future platform)

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `GET/POST /api/admin/cities` / `PATCH /api/admin/cities/{id}` | City configuration; new city creation is platform-admin only. | Target multi-city setup. |
| `GET/POST /api/admin/tenants` / `PATCH /api/admin/tenants/{id}` | `Tenant` records and department hierarchy. | City admin within own city. |
| `GET/POST /api/admin/categories` / `PATCH /api/admin/categories/{id}` | Category taxonomy and base triage/SLA references. | City admin; changes must preserve or migrate existing report category IDs. |
| `GET/POST /api/admin/zones` / `PATCH /api/admin/zones/{id}` | GeoJSON zones with names and external IDs. | City admin; validate geometry and overlaps. |
| `GET/POST /api/admin/responsibilities` / `PATCH /api/admin/responsibilities/{id}` | Category + optional zone + tenant + order rules. | City admin; preview unassigned/overlapping areas before activation. |
| `GET/POST /api/admin/memberships` / `PATCH /api/admin/memberships/{id}` | Staff/contractor tenant roles and scope. | City/department admin as permitted; identity account comes from configured auth. |
| `POST /api/admin/user-invitations` | `{ email, tenant_id, roles[] }`; return invitation ID/state. | City admin; invite/provision through configured identity system, never return or store a plaintext password in the API response. |
| `GET/POST /api/admin/contracts` / `PATCH /api/admin/contracts/{id}` | Contractor contract references, coverage, SLA and billing settings. | Authorized city admin; no tender process in this API. |
| `POST /api/admin/imports` | Multipart CSV/GeoJSON plus `kind` (`units`, `zones`, `categories`, `contacts`, `users`, `historical_incidents`); return import ID and validation state. | City admin; no live mutation yet. |
| `GET /api/admin/imports/{id}` / `POST /api/admin/imports/{id}/commit` | Preview errors, counts, conflicts and proposed changes; commit accepted import idempotently. | City admin; preserve source IDs and provenance. |
| `GET /api/admin/audit-events` / `POST /api/admin/exports` | Scoped audit search / an asynchronous export job for authorized records requests. | Authorized auditor/admin; export applies privacy and retention rules. |

CSV import headers follow the SPEC's examples: units use `unit_code,unit_name,email,phone,parent_code`; contacts use `unit_code,contact_name,role,email,phone`. User imports require at least `email,tenant_code,role`; category imports require `category_id,label,description`. Zone imports accept a GeoJSON `FeatureCollection` with `tenant_code` and `area_name` properties; the importer resolves these to internal IDs and reports unresolved references. Historical records are never silently marked as live city data.

### External systems, telemetry and webhooks (future platform)

| Operation | Request / success response | Trust rule |
| --- | --- | --- |
| `POST /api/integrations/reports` | Trusted external report with `external_id`, `source_system`, category, description, location, observed time and optional permitted contact/attachment references; return internal report ID and triage state. | Scoped service credential, idempotent on source + external ID. No arbitrary `source: "city"` from anonymous users. |
| `POST /api/integrations/observations` | One `Observation` or a bounded batch; return accepted/rejected counts and IDs. | Scoped source credential; validate units, timestamp and location. Thresholds may suggest or create incidents after server-side validation. |
| `GET/POST /api/admin/webhook-subscriptions` / `PATCH /api/admin/webhook-subscriptions/{id}` | Tenant-scoped destination, event types, active flag and signing-key rotation metadata. | Admin only; secrets are write-only and never returned in full. |
| Outbound `POST` to a configured webhook URL | `{ event_id, type, occurred_at, city_id, tenant_id?, entity_id, data }` with an HMAC signature header. | At-least-once delivery; consumers deduplicate by `event_id`. Event payloads omit PII unless the subscription is specifically authorized. |

The first outbound event types are `report.created`, `incident.created`, `incident.priority_changed`, `incident.status_changed`, `incident.assigned`, `work_order.created`, `work_order.updated` and `sla.breached`. Each event has a schema version. Contractor systems can use the scoped work-order API instead of a portal; SFTP feeds, GTFS-RT polling and ERP adapters are optional implementations behind the same domain boundary. The backend must record source and last successful sync so the UI can distinguish live, stale and unavailable integrations.

Foundation health endpoints are `/api/health/live` and `/api/health/ready`, described above; no metrics endpoint is implemented. Future-platform monitoring includes API errors/latency, ingestion lag, queue backlog, open incidents, deduplication decisions and SLA breaches, separate from public open data. Audit events are append-only and tamper-evident in the target system; retention, EU data residency, backup and export policies are deployment controls, not values the browser can assert. Pilot training, governance and offline field sync remain delivery work outside the HTTP contract.

## Specification coverage and precedence

| Source | Contract surface |
| --- | --- |
| Feature FR-001–005, FR-020–025 | ElevenLabs browser session, owned/revisioned draft, explicit confirmation, idempotent shared form/voice submission, guest/demo identity, fallback and failure states. |
| Feature FR-006–011 | Separate report/incident/evidence, triage states, Qdrant candidates plus source-store checks, deterministic grouping and responsibility review. |
| Feature FR-012–014, FR-018–019 | Immutable proposal, official-only versioned approval, one-ticket execution, institution scope, transitions and audit. |
| Feature FR-015–017 | Public incident map/timeline, distinct-identity support and allowlisted projection; no public raw reports. |
| Root SPEC 1–5 | Future multi-tenancy, city/category/zone responsibility, priority and deduplication extensions; feature grouping rules take precedence for the PoC. |
| Root SPEC 6–8 | Later emergency/contractor/finance workflows, integration/webhook APIs and city onboarding. These are deferred, not missing PoC endpoints. |
| Root SPEC 9–11 | Later open data, operations, broader dashboard, audit/exports and governance; feature privacy and reliability rules apply now. |

## Integration and delivery rules

1. **Migrate the existing map as one coherent slice.** The current frontend fetches categories before `GET /api/reports`, validates `LegacyReport`, uses `source: "demo"` and computes heat from severity plus raw confirmation actions. The specified map instead consumes `PublicIncident`; switch its data hook, GeoJSON/heat mapping, search, details, nearby list, category counts and affected action together. Existing demo report/confirmation routes must return an explicit migration error after every caller moves; do not silently expose raw reports as public incidents. Demo fixtures need explicit report-to-incident links and fictional identities, never invented identities from old counts.
2. **Persist before announcing success.** Form and voice use the same confirmed draft and submission key. Save the report and pending-triage record transactionally; never hold a transaction open for ElevenLabs, an LLM or Qdrant. A lost response is recovered through the draft/reference, not a second report. Persist processing attempts and reclaim them after restart; do not rely on an unawaited request-handler promise.
3. **Separate retrieval, judgment and authority.** Qdrant is a rebuildable index, not the source of truth. Search results can lack a category, but a new map report requires an API-defined one. Index staleness cannot hide recent source-store grouping candidates, and deleted/restricted records must not leak through search. An agent may propose; official approval binds current versions and exact payload; execution reconciles unknown outcomes before resending. Neither prompt text, MCP tool visibility nor a provider approval dialog supplies authorization.
4. **Keep public claims truthful.** Publish only controlled incident summaries/locations; do not disclose private/unit-only reports, identities, transcripts or unreviewed generated updates. Label guests, demo institutions and observations. The selected lift/pothole/drain/outage narratives are unverified resident inputs: preserve reported impact, unknown water trend and uncertain outage scope without inventing injury, cause, ownership or additional supporting identities. Corroboration is not verification, ticket acknowledgement is not work started, a location highlight is not an outage footprint and an ordinary ticket is not emergency dispatch.
5. **Deliver the specified PoC before platform breadth.** Start from the local PostgreSQL/authentication foundation, then follow the feature plan's slices: durable domain/form/incident projection; official approval and institution loop; ElevenLabs voice; Qdrant/agent/MCP retrieval; then demo identity polish and manual privacy/accessibility review. The root SPEC's multi-city, contractor, finance, production identity, telemetry and open-data features remain future work. Confirm setup inputs (ElevenLabs account/agent, hosting, database, Qdrant, retention and demo fixtures) before claiming those integrations work.

# Frontend–backend contract

Status: target contract for the system in [spec.md](../spec.md), 2026-10-03. The resident endpoints marked **PoC** exist today as Next.js demo route handlers. Every other endpoint below is a proposed interface, not an implemented service or a city integration. Before implementing a slice, frontend and backend should update this file together if its wire format or behaviour changes.

The later [voice and incident discovery draft](plans/2026-10-03-voice-incident-design.md) adds an accepted approval boundary before an agent contacts an institution or executes a ticket. The approval and search surfaces below reflect that direction and the [Qdrant search decision](knowledge-base/qdrant-search.md); they do not turn the draft's scenario, provider or hosting recommendations into approved implementation choices.

## Scope and vocabulary

This contract covers the resident map, municipal staff dashboard, contractor portal, city administration, external ingestion and public open data described in the SPEC. It defines the boundary between clients and the backend; it does not select a database, identity provider, queue or cloud vendor.

| Term | Meaning |
| --- | --- |
| City | Top-level data and configuration boundary. The PoC has one city, Kraków; the target platform can host more. |
| Tenant | A city department, external contractor or city administration group within one city. A tenant's identity and access scope come from the authenticated actor, not a client-supplied filter. |
| Report | One resident submission or verified city notice. Reports remain separate so their provenance and confirmation counts can be shown on the map. |
| Incident | The operational case handled by staff. One incident can group several reports; it has one lifecycle, priority and lead owner, plus supporting tenants when needed. |
| Work order | An assignment of incident work to a contractor under a known contract. It does not itself transfer ownership of the incident. |
| Observation | A timestamped external signal, such as a water-level reading or transit feed event. It is evidence, not automatically a verified incident. |

This report/incident split is a design decision needed to make the SPEC's deduplication and cross-unit workflows explicit. The existing frontend still consumes reports; staff views will consume incidents. A report may initially have no `incident_id` while triage runs. The SPEC's example `/api/incidents` routes refer to operational cases; the existing `/api/reports` routes remain the resident-facing API.

## Common wire rules

- JSON property names use `snake_case`. IDs are opaque nonempty strings; clients must not infer meaning from their format. Timestamps are ISO 8601 strings with a UTC offset; the backend emits UTC. Coordinates are WGS84 decimal `lat` and `lng`, with GeoJSON coordinates in `[lng, lat]` order.
- Collection responses use `{ "items": [...], "next_cursor": string | null }` unless a route below preserves an existing PoC envelope. `limit` and `cursor` are optional query parameters. Map queries also accept `bbox=west,south,east,north`; the backend applies the actor's city and tenant scope before filtering.
- Write responses return the created or updated resource. Writes that can be retried after a timeout accept `Idempotency-Key`; the same actor, route and key must return the original result without repeating the action. This is a target requirement; the PoC handlers do not implement it yet.
- Errors use an HTTP status plus `{ "error": "Human-readable message", "code": "stable_machine_code", "details"?: object }`. Keeping `error` as a string preserves the current frontend error display. Use `400` for invalid input, `401` for missing authentication, `403` for forbidden scope, `404` for absent or hidden resources, `409` for invalid state or stale updates, `413` for oversized attachments and `429` for rate limits. The PoC currently returns only `{ "error": string }` for its handled errors.
- Authenticated staff and contractor APIs require a bearer token from the configured SAML/OIDC identity provider or native authentication with MFA, or a scoped service credential for integrations. The backend derives `city_id`, tenant membership and roles from that credential. It must not accept a request body's `tenant_id`, `updated_by` or `city_id` as proof of authority. The city for anonymous public routes comes from trusted deployment/host configuration. Residents can read public data and submit reports without staff credentials in the PoC; abuse controls and resident identity are still open decisions.
- Public responses exclude reporter contact details, private notes, internal audit payloads and contractor financial fields. Raw provider payloads stay server-side. Do not combine demo and real incidents in one response without an explicit provenance marker for each record.

## Access roles

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

Permissions are enforced per resource and action, including nested resources. A public report can be visible to residents while its linked incident contains private staff data. Cross-tenant visibility requires an explicit assignment, sharing relation or city-level role. Roles are illustrative identifiers for the contract; the identity provider and exact permission grants are configured per city.

The voice draft's dispatcher and decision-maker are workflow actors, not automatic RBAC grants. Institution users are scoped to their own tenant, and an official approval is a distinct server-enforced permission. An agent tool list does not grant access on its own.

## Shared data shapes

### City configuration

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

### Resident report: existing PoC shape

`GET /api/reports` returns `{ "source": "demo" | "live", "reports": Report[] }`. The current code accepts any string for `source` and emits `demo`; `live` is the target marker for a fully real response. `POST /api/reports` and `POST /api/reports/{id}/confirmations` return one `Report` directly. The frontend fetches categories first and discards a report whose `category_id` is unknown or whose required fields fail validation.

| Field | Required | Meaning and source |
| --- | --- | --- |
| `id`, `reference` | Yes | Backend-generated unique ID and human-facing reference. The exact reference format is not a client contract. |
| `category_id`, `title`, `description` | Yes | Resident input or a verified city notice. `description` may be an empty string. Every report has exactly one category returned by the city API. |
| `severity` | Yes | `low`, `medium` or `high`; currently resident-selected. It is not the staff incident priority. |
| `status` | Yes | `reported`, `confirmed`, `in_progress` or `resolved`; public status semantics are below. |
| `source` | Yes | `resident` or `city`. `city` requires an authenticated city publisher or trusted integration, not a self-selected form value. |
| `reported_at`, `updated_at` | Yes | Backend timestamps for creation and last accepted change. |
| `lat`, `lng` | Yes | Map pin. The current create route restricts them to `49.96 <= lat <= 50.13` and `19.79 <= lng <= 20.22`; a multi-city backend must validate against the configured city boundary instead. |
| `address` | Yes | Human-readable location. The current UI uses Photon reverse geocoding and falls back to `Pinned location (no street address)`; coordinates remain authoritative. |
| `district` | No | Reverse geocoder result or official city zone lookup. Omit if unknown. |
| `confirmations` | Yes | Nonnegative count, starting at one for the reporter in the PoC. It is an action count until the backend can identify distinct residents. |
| `responsible`, `expected_fix_at`, `affected` | No | Verified assignment, promised/estimated repair time and plain-language impact. Omit until a staff action or trusted source supplies them. Never manufacture them from category or geolocation. |

`POST /api/reports` accepts `category_id`, `title` (3–80 trimmed characters), `description` (0–1000 trimmed characters), `severity`, `lat`, `lng`, `address` (1–200 trimmed characters) and optional `district` (at most 100 trimmed characters). The backend checks that the category exists. Success is `201` with a complete `Report`, `status: "reported"`, `source: "resident"`, `confirmations: 1` and backend timestamps. The PoC rejects invalid input or an unknown category with `400`.

`POST /api/reports/{id}/confirmations` has no JSON body and returns the updated `Report` with `200`. The PoC returns `404` if the report is absent and `409` if resolved. It increments the count on every accepted request and changes `reported` to `confirmed` at three confirmations. The browser's local storage suppresses repeat clicks only in that browser; it does not enforce one person/one confirmation. A real backend must add identity or abuse controls before presenting this as a verified resident count. Confirmation alone is not proof of dispatch to a city service.

### Staff incident and linked objects: target shapes

The staff `Incident` response contains the following fields. Nullable or optional fields are omitted or `null` only where noted; clients should not infer a status from their absence.

| Field group | Required fields | Optional fields |
| --- | --- | --- |
| Identity and location | `id`, `city_id`, `category_id`, `title`, `description`, `lat`, `lng`, `created_at`, `updated_at` | `address`, `zone_id`, `asset_id` (building, road or other matched city asset). |
| Triage | `status`, `priority` (`low`, `medium`, `high`, `critical`), `priority_score` (nonnegative number, higher means more urgent), `priority_reasons[]`, `report_count`, `confirmation_count` | `triage_state` (`pending`, `complete`, `needs_review`), `assessment` (`suspected`, `corroborated`, `verified`, `disputed`), `emergency` flag. Priority is computed or explicitly overridden with actor and reason in history. |
| Ownership | `lead_tenant_id` (nullable while unassigned), `supporting_tenant_ids[]`, `report_ids[]` | `assigned_user_id`, `related_incident_ids[]`, `contract_id`. A contractor work order does not grant access to unrelated reports. |
| Time and cost | `version` (integer for concurrency control) | `due_at`, `expected_fix_at`, `resolved_at`, `closed_at`, `estimated_cost`, `actual_cost`, `currency`, `budget_line`, `reserve_budget` (boolean), `invoice_reference`, `invoice_submitted_at`, `payment_due_at`, `payment_status_reference`. Payment status is synchronized from finance, not set by this system as proof of payment. |

`Report` is the immutable origin of a resident observation except for permitted corrections, confirmation count and public projection. Its target staff representation also includes `incident_id` (nullable until triage), reporter contact in a separately permissioned field, attachment IDs and provenance. `Incident` is the deduplicated operational case. A `DuplicateLink` records `report_id`, `incident_id`, match signals (category, distance, time, text), score, decision (`suggested`, `linked`, `rejected`) and reviewer; the algorithm can suggest links, while uncertain matches require review. No machine-learning result is promised for the first implementation.

| Linked object | Required fields | Optional fields |
| --- | --- | --- |
| `StatusEvent` / `AuditEvent` | `id`, `entity_type`, `entity_id`, `action`, `actor_type`, `actor_id`, `occurred_at`; status events also have `from_status` and `to_status` | Before/after values, reason, source system and correlation ID. Public history is a separate redacted projection. |
| `Note` | `id`, `incident_id`, `visibility` (`internal`, `public`), `text`, `author_id`, `created_at` | Attachment IDs. Contractor notes are internal unless approved for publication. |
| `Task` | `id`, `incident_id`, `title`, `status` (`open`, `in_progress`, `done`, `cancelled`), `created_at` | Assignee, due date and completion date. |
| `Attachment` | `id`, `owner_type`, `owner_id`, `mime_type`, `size_bytes`, `created_at` | Caption; download access is checked on every request. |
| `WorkOrder` | `id`, `incident_id`, `contract_id`, `contractor_tenant_id`, `status` (`offered`, `accepted`, `scheduled`, `in_progress`, `completed`, `accepted_by_city`, `rejected`, `cancelled`), `created_at`, `updated_at`, `version` | Due date, schedule, completion note, evidence IDs, estimated/actual cost and acceptance actor/time. |
| `ActionProposal` | `id`, `incident_id`, `incident_version`, `destination_tenant_id`, `action_type`, `payload`, `evidence_ids[]`, `rationale`, `status` (`pending`, `approved`, `rejected`, `superseded`), `version`, `created_at` | Approver, decision time and reason. Approval binds to the exact destination, action and payload version. |
| `ServiceTicket` | `id`, `incident_id`, `approved_proposal_id`, `institution_tenant_id`, `status` (`submitted`, `acknowledged`, `in_progress`, `resolved`, `rejected`), `created_at`, `updated_at` | External reference, delivery result and public-safe timeline events. This is an institution request, distinct from a contracted work order. |
| `Observation` | `id`, `source_system`, `external_id`, `kind`, `observed_at`, `lat`, `lng`, `values` | Linked incident ID and provenance metadata. Sensor thresholds are configured server-side. |
| `Notification` | `id`, `recipient_user_id`, `kind`, `created_at`, `read_at` | Incident/work-order reference and message. |

## Lifecycle and public projection

| Staff incident state | Entry condition | Public report projection |
| --- | --- | --- |
| `new` | First report or trusted observation accepted. | `reported` unless the report already meets the resident confirmation threshold. |
| `triaged` | Category, duplicate decision and priority recorded. | `reported` or `confirmed` according to confirmations. |
| `assigned` | Lead tenant or dispatcher accepts responsibility. | `reported` or `confirmed`; assignment must be shown separately if public. |
| `in_progress` | An authorized worker or dispatcher records work starting. | `in_progress`. |
| `awaiting_acceptance` | Contractor or field team submitted completion evidence. | `in_progress` until verified. |
| `resolved` | Authorized city worker verifies the fix. | `resolved`. |
| `closed` | Administrative closure after resolution. | `resolved`. |

An incident can also be marked `emergency` with `priority: "critical"`; that is a flag and escalation path, not a parallel lifecycle. Reopen requires an audited state change. A contractor may update its own work order, but cannot set the incident to `resolved` or `closed`. SLA breaches and volume spikes produce alerts; thresholds and deadlines come from city/contract configuration, not hard-coded claims about Kraków. The current UI text for `confirmed` says the case was passed to a service, while the PoC only counts three confirmations; that copy must be corrected or an actual dispatch must be implemented before the workflow is presented as live.

Corroboration by residents is not verification of an incident. The proposed voice/agent workflow records assessment (`suspected`, `corroborated`, `verified`, `disputed`) separately from response status. An agent can prepare an `ActionProposal`, but only an authorized official can approve it; the executor checks approval, proposal version, destination and idempotency before sending a `ServiceTicket` or contacting an institution. An ordinary staff work order is created only under that actor's separately enforced dispatch permission. Approval of a proposal never grants the agent a general write permission.

## HTTP operations by surface

The response object names below refer to the shared shapes above. Routes marked **PoC** are implemented in the Next app today; **target** routes are design interfaces to implement as slices. The backend may sit behind the Next route handlers, but the browser-visible contract must stay stable within a slice.

### Resident and public data

| Operation | Request / success response | State |
| --- | --- | --- |
| `GET /api/categories` | `200 { categories: CategoryPublic[] }`; at least one category in the current frontend. Target accepts optional `locale` and returns localized labels when configured. | PoC |
| `GET /api/reports` | `200 { source, reports: Report[] }`. Target filters: `bbox`, `category_id`, `status`, `limit`, `cursor`; when pagination is enabled, add `next_cursor`. The map client must fetch every page needed for its view. | PoC without filters/pagination |
| `GET /api/reports/{id}` | `200 Report`; public fields only, `404` when hidden or absent. | Target |
| `POST /api/reports` | Create input above; `201 Report`. Reject unknown categories and invalid city coordinates. | PoC |
| `POST /api/reports/{id}/confirmations` | Empty body; `200 Report`, `404` absent, `409` resolved/already confirmed under a future identity policy. | PoC without identity enforcement |
| `POST /api/reports/{id}/attachments` | Multipart photo/document plus a reporter capability or authenticated identity; `201 Attachment` with public-safe metadata. The create response must issue a short-lived reporter capability separately from the public `Report` DTO before anonymous uploads are enabled. | Target |
| `GET /api/open/incidents` | Paginated, anonymized `{ items: PublicIncident[], next_cursor }`; filters for district/category/date. `PublicIncident` contains `id`, `category_id`, `public_status`, `reported_at`, `updated_at`, `lat`, `lng` and optional `district`; locations may be coarsened by category policy. `Accept: text/csv` returns the same permitted columns as CSV. | Target |
| `GET /api/open/metrics` | Aggregated counts by period, category and district; no reporter identity or staff notes. | Target |

The resident app also calls Photon for place search and reverse geocoding. That call is outside this backend contract. Map tiles and official GIS geometry are separate data providers; their outages do not turn a report into an invalid incident.

The frontend derives nearby reports from report coordinates and heatmap weight from severity plus confirmations; those values are not separate backend fields. A sparse live dataset may legitimately produce no nearby items or heat clusters.

### Municipal staff and dashboards

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `GET /api/me` | `200 { user_id, city_id, memberships[], permissions[] }`. | Authenticated actor; UI uses this to show permitted actions, while the server rechecks every write. |
| `GET /api/incidents` / `GET /api/incidents/{id}` | Paginated `Incident[]` / one `Incident`; filters: status, priority, category, zone, assignee, due date and `bbox`. | Only permitted city/tenant/assigned cases. |
| `PATCH /api/incidents/{id}` | Explicit editable fields such as title, category, lead/supporting tenants, assignee, priority override and budget tags; include `expected_version`; `200 Incident`, `409` stale version. | Dispatcher/supervisor as permitted; every change is audited. This replaces the SPEC's illustrative unrestricted `PUT`. |
| `POST /api/incidents/{id}/status-events` | `{ status, note?, expected_version }`; `201 StatusEvent` and updated incident reference. | Validate lifecycle and role. Contractor completion alone cannot resolve. |
| `GET /api/incidents/{id}/duplicate-candidates` | Suggested report matches with score and reasons. | Staff in scope; suggestions are not automatic truth. |
| `POST /api/incidents/{id}/report-links` / `DELETE /api/incidents/{id}/report-links/{report_id}` | Link or unlink a report with reason; return updated incident and recomputed counts/priority. | Authorized triage role; audit both actions. |
| `GET/POST /api/incidents/{id}/notes` | List or create `Note`; request has `text`, `visibility`, optional attachment IDs. | Public notes require publication permission. |
| `GET/POST /api/incidents/{id}/tasks` / `PATCH /api/incidents/{id}/tasks/{task_id}` | List, create or update `Task`. | Staff scoped to incident; contractors only through assigned work orders. |
| `POST /api/incidents/{id}/related-incidents` / `DELETE /api/incidents/{id}/related-incidents/{related_id}` | Link or unlink operationally related cases; return incident relation and audit entry. | Authorized commander/dispatcher; sharing across tenants is explicit. |
| `POST /api/incidents/{id}/observations` | `{ observation_id, reason }`; return linked incident and audit entry. | Authorized staff; telemetry remains evidence until reviewed. |
| `POST /api/incidents/bulk-actions` | Array of `{ incident_id, action, expected_version }`; return a per-item success/error result. | Staff role checked for each incident; one invalid item does not silently update another. |
| `GET /api/incidents/{id}/history` | Ordered, permission-filtered status and audit history. | Staff/auditor in scope. |
| `GET /api/search/records` | `q`, optional filters and cursor; paginated scoped hits with `record_type`, `record_id`, excerpt, score, `category_id` (nullable for uncategorized indexed records) and index freshness. | Search is backed by the selected Qdrant index, not the source of truth. The backend applies each record's visibility rules and distinguishes unavailable/stale index from no results. |
| `POST /api/attachments` / `GET /api/attachments/{id}` | Multipart upload with owner reference; `201 Attachment`. Download after access check. | Size/type limits configured server-side; private files are never exposed as public URLs. |
| `GET /api/dashboard/summary` | Counts by status/priority/tenant, overdue SLAs and current escalation totals for the actor's scope. | Staff dashboard and inbox. |
| `GET /api/notifications` / `POST /api/notifications/{id}/read` | Paginated user notifications; mark one as read. | Recipient only. Delivery by email/SMS is a backend side effect, not a browser promise. |

### Contractors and finance references

| Operation | Request / success response | Authorization and effect |
| --- | --- | --- |
| `POST /api/incidents/{id}/work-orders` | `{ contract_id, contractor_tenant_id, due_at?, scope, estimated_cost? }`; `201 WorkOrder`. | Supervisor/dispatcher with dispatch permission; contract must cover category, zone and date. |
| `POST /api/incidents/{id}/action-proposals` / `GET /api/action-proposals/{id}` | Create a versioned destination, payload, evidence and rationale / fetch its decision state. | Scoped decision-maker may propose, but cannot approve or execute the proposal. |
| `POST /api/action-proposals/{id}/decision` | `{ decision: "approved" | "rejected", reason?, expected_version }`; return updated proposal. | Authorized official only; stale or modified proposals require a new decision. |
| `POST /api/action-proposals/{id}/execute` / `GET /api/service-tickets/{id}` | Execute an approved action idempotently / fetch delivery and work status. | Trusted server executor only; institution receives only its ticket and permitted evidence. |
| `POST /api/service-tickets/{id}/updates` | Institution acknowledgement or work-status update; return updated ticket. | Assigned institution only; it cannot resolve the city's incident directly. |
| `GET /api/work-orders` / `GET /api/work-orders/{id}` | Paginated assigned work orders / one work order with permitted incident summary. | Contractor sees only own assignments; city staff see cases in scope. |
| `POST /api/work-orders/{id}/updates` | `{ status, note?, scheduled_at?, attachment_ids?, expected_version }`; `200 WorkOrder`. | Assigned contractor or city worker; allowed statuses include `accepted`, `scheduled`, `in_progress`, `completed`. |
| `POST /api/work-orders/{id}/acceptance` | `{ decision: "accepted" | "rejected", note?, actual_cost?, invoice_reference?, expected_version }`; `200 WorkOrder`. | Authorized city inspector/supervisor. Invoice number and cost are references for finance; payment remains in the city's ERP. |
| `GET /api/finance/incident-costs` | Scoped export/list of estimates, actual costs, budget line, reserve flag, invoice references and overdue-payment flags based on configured terms. | Finance-authorized staff only. |

Financial amounts in JSON are decimal strings plus ISO currency codes; clients must not use binary floating-point values for totals. SLA and invoice deadlines come from configured contracts and finance records, not a universal number of days.

### City configuration and onboarding

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

### External systems, telemetry and webhooks

| Operation | Request / success response | Trust rule |
| --- | --- | --- |
| `POST /api/integrations/reports` | Trusted external report with `external_id`, `source_system`, category, description, location, observed time and optional permitted contact/attachment references; return internal report ID and triage state. | Scoped service credential, idempotent on source + external ID. No arbitrary `source: "city"` from anonymous users. |
| `POST /api/integrations/observations` | One `Observation` or a bounded batch; return accepted/rejected counts and IDs. | Scoped source credential; validate units, timestamp and location. Thresholds may suggest or create incidents after server-side validation. |
| `GET/POST /api/admin/webhook-subscriptions` / `PATCH /api/admin/webhook-subscriptions/{id}` | Tenant-scoped destination, event types, active flag and signing-key rotation metadata. | Admin only; secrets are write-only and never returned in full. |
| Outbound `POST` to a configured webhook URL | `{ event_id, type, occurred_at, city_id, tenant_id?, entity_id, data }` with an HMAC signature header. | At-least-once delivery; consumers deduplicate by `event_id`. Event payloads omit PII unless the subscription is specifically authorized. |

The first outbound event types are `report.created`, `incident.created`, `incident.priority_changed`, `incident.status_changed`, `incident.assigned`, `work_order.created`, `work_order.updated` and `sla.breached`. Each event has a schema version. Contractor systems can use the scoped work-order API instead of a portal; SFTP feeds, GTFS-RT polling and ERP adapters are optional implementations behind the same domain boundary. The backend must record source and last successful sync so the UI can distinguish live, stale and unavailable integrations.

Operational health and performance endpoints are internal to deployment (`/health/live`, `/health/ready`, `/metrics`), separate from public open data. Monitoring must include API errors/latency, ingestion lag, queue backlog, open incidents, deduplication decisions and SLA breaches. Audit events are append-only and tamper-evident in the target system; retention, EU data residency, backup and export policies are deployment controls, not values the browser can assert. Pilot training, governance and offline field sync remain delivery work outside the HTTP contract.

## SPEC coverage

| SPEC section | Contract surface |
| --- | --- |
| 1. Goals and scope | Resident reports, staff incidents, public status and dashboard. |
| 2–3. Tenancy, roles and responsibilities | City/tenant/membership shapes, authorization and category/zone routing. |
| 4–5. Data, duplicates and triage | Report, incident and linked-object shapes; duplicate candidate/link operations and priority fields. |
| 6. Normal, emergency and contractor workflows | Lifecycle, escalation, work orders, acceptance, SLA and finance references. |
| 7. Integration APIs | Report and observation ingestion, scoped contractor API and signed outbound webhooks. |
| 8. City onboarding | Configuration CRUD, import preview and commit, CSV/GeoJSON requirements. |
| 9. Operations and open data | Privacy, audit, monitoring, health and anonymized public JSON/CSV. |
| 10. Staff and field UX | Inbox/dashboard, notifications, bulk actions and mobile-consumable JSON; accessibility and offline UI are client/delivery concerns. |
| 11. Rollout and governance | Audit/export support is an API concern; pilot, training and operating agreements are delivery concerns. |

## Integration rules and open decisions

1. **Keep the current resident slice working.** The frontend currently fetches categories before reports, expects the report DTO above and uses `source: "demo"` to label seed data. A backend replacement must return all required fields, including an empty `description` where appropriate. Unknown categories or invalid report DTOs are discarded by the client; an invalid categories envelope fails the whole view.
2. **Do not imply city action from crowd activity.** `confirmed` currently means a threshold of resident actions. `in_progress`, `resolved`, `responsible`, `expected_fix_at` and `affected` require staff actions or a trusted integration. The UI copy and future public projection must match the actual evidence.
3. **Decide before a live pilot:** persistent storage and deployment; resident identity/anti-abuse for confirmations; which city system can send incidents and status updates; public location granularity and retention; exact category and responsibility ownership; notification channels and SLA rules. These are dependencies of a truthful live rollout, not hidden defaults in this contract.
4. **Integrate one vertical slice at a time.** Start with persisted resident reports and categories, then staff triage/assignment, status updates, contractor work orders, administration/imports, and finally external signals/open data. Each slice is complete only when the client consumes its real response, handles empty/error/forbidden states and the backend enforces access. The full SPEC is the target; this document does not claim those slices are already built.
5. **Preserve the newer approval and search decisions.** Voice intake and agent-assisted triage may reuse these domain operations, but the agent cannot approve its own external action. The Qdrant index is derived from persisted records and may include uncategorized historical tickets; the required category on a newly submitted public map report does not imply that every search hit has one.

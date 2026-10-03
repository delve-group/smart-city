# Project context

Updated: 2026-10-03.

## Confirmed

- Project: Smart City, built under hackathon conditions. Current phase: proof of concept.
- Delivery speed matters a lot. Code should stay modular and easy to maintain and scale.
- Deployment constraint (2026-10-03, D034): use **Scaleway**, where the team already has billing set up. Prioritize a working demo, simple deployment and simple local development. Expect a peak around **15 concurrent application users**, with **30** as the upper planning bound; capacity has not been measured. Simultaneous voice demand and provider capacity remain to be confirmed. Large-scale infrastructure is outside this PoC.
- UI base: Appica UI (`@appica/ui-react`). One neutral, professional theme in light and dark mode (2026-10-03, replaced the earlier Civic and Signal themes).
- Verification rules are defined only in [AGENTS.md](../../AGENTS.md). No tests during the PoC phase.
- All documentation, code and UI copy are written in English.
- Kraków has publicly published official map services (MSIP and GUGiK). The identified sources and pre-integration checks are described in the [geospatial data note](geospatial-data.md).
- Product direction (2026-10-03): **residents report problems in the city** — power outages, broken street lights, burst pipes, potholes, broken lifts, illegal dumping, smoke from illegal burning — at a precise location. The map shows open reports by category, a heatmap of where problems cluster, and nearby related reports, so residents see what is already known and city services see patterns. This answers the task's "responding to failures and disruptions", "communication between residents and public institutions" and "using urban data to support decisions".
- Every report belongs to exactly one category. Categories are defined by the API, not the frontend.
- Voice/incident direction (2026-10-03): a report is one resident observation; an incident aggregates related reports and tracks the response. The proposed roles are dispatcher, decision-maker and institution, with official approval before external contact or ticket execution. Browser voice is the confirmed first channel; a phone number comes later. Government identity is a demo mock. Current requirements and acceptance criteria are in the [feature specification](../../specs/001-voice-incident-response/spec.md); integration and tool contracts are in its [technical plan](../../specs/001-voice-incident-response/plan.md).
- Voice provider (2026-10-03): **ElevenLabs Agents**, explicitly selected by the user. Browser voice first; no GPT-Live/Realtime provider comparison is pending. Integration and account validation are not yet done.
- Agent and MCP ticket/incident search: provider and scope accepted in D029; implementation is pending. Read the [Qdrant search guide](qdrant-search.md), including its handling of uncategorized source records, before implementing search.
- Selected citizen scenarios: broken lift (5), dangerous pothole (3), blocked drain (2) and power outage (1). Canonical report scripts and reuse guidance for manual testing and demo videos are in [Citizen use cases](citizen-use-cases.md). Selection does not imply that the scenarios have been executed or their workflows implemented.

## Working assumptions

- Web app, usable on phones and desktops.
- Light or dark follows the OS setting; the map settings control overrides it.
- City reports shown in the HTML preview are only a presentation example, not an approved product scope.
- The feature specification adopts a street outage plus apartment-only counterexample, one active institution ticket per incident, and explicit grouping/publication rules as reversible PoC defaults. Its plan uses PostgreSQL and polling; these are not provisioned resources or separate claims of user approval.

## To be decided

- ElevenLabs account access, configured voice/agent/model, retention settings and live conversation validation.
- Institution responsibility data, service observations and ticket connector contracts; real access is not established.
- Scaleway resource/runtime choice, deployment owner and primary-store provisioning; matching, public visibility and refresh defaults are specified and need implementation verification.
- Reproducible local startup and deployment commands, provider capacity and the team's concrete time constraints. Scaleway selection does not establish whether Qdrant remains in Free Cloud or is hosted on Scaleway.

## Implementation-readiness review — 2026-10-03

The feature specification and API contract agree on the main response loop. The current report-map behavior and the root platform vision are explicitly separate scopes, not competing requirements. New resident reports requiring a category and search accepting uncategorized source records are also intentional.

Resolve these documentation gaps in their owning files before the dependent implementation:

- **Architecture wording:** the [architecture](../architecture.md#data-flow) still describes preserving the old API contracts and an undecided primary store. The [feature plan](../../specs/001-voice-incident-response/plan.md) instead defaults to PostgreSQL and requires a coordinated report-to-incident API/UI migration. Keep implemented behavior separate from that planned change.
- **Search corpus and projections:** the [Qdrant guide](qdrant-search.md) uses generic ticket title/description and original-text results, while the [API contract](../api-contract.md#specified-poc-data-shapes) separates reports, incidents and service tickets with different audiences. Define indexed record kinds, stable identities, permitted text per audience and what the 1,000-ticket bound counts; service tickets alone cannot cover incidents awaiting approval. Apply the plan's source hydration and current-access checks to every search result.
- **Wire contracts:** the [API contract](../api-contract.md#http-operations-by-surface) still needs concrete session bootstrap/login, location lookup and official-command request/response shapes. The plan's versioned report-triage command also needs its concurrency token represented in the report contract. These are implementation gaps, not permission to invent different contracts independently in the frontend, voice tools and backend.
- **Runtime and local development:** the [plan](../../specs/001-voice-incident-response/plan.md#4-persistence-concurrency-and-agent-execution) requires a supervised consumer for durable processing/indexing work. The current [run instructions](../../README.md#running) only start the mock frontend. Document the web and worker entry points, environment example, migrations/demo seed, persistent storage and public HTTPS setup together. No deployment files or working persistent startup flow have been delivered by this review.
- **Provider setup:** distinguish concurrent app users from account-wide ElevenLabs conversations, and choose where dense embeddings run before replacing Qdrant Cloud with a local or Scaleway container. Per-identity voice limits and a running Qdrant database do not resolve those dependencies.

This review records constraints and open work; it does not select an Instance size, replace the Qdrant hosting default, provision resources or verify runtime performance.

## Delivery status

Done: agent rules, knowledge base, architecture, design system, HTML preview and a Next.js PoC — a full-screen map of resident reports in Kraków (MapLibre + OpenFreeMap) with a heatmap of resident reports, category filter, search (reports + places via Photon), hover tooltips, a detail panel and a report flow (pin placement + form), "I'm affected too" confirmations, fed by a mock backend (`/api/categories`, `/api/reports`, in-memory store). The ElevenLabs voice and incident feature is specified, not implemented. Missing: separate incidents, persistent storage, voice, actor tools, operator approvals, institution tickets, cross-screen updates and real city-service integrations.

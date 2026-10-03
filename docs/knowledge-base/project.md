# Project context

Updated: 2026-10-03.

## Confirmed

- Project: Smart City, built under hackathon conditions. Current phase: proof of concept.
- Product name: **mRadar**. Its radar-sweep mark represents detecting and grouping reported city issues; it does not represent surveillance or emergency dispatch.
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
- Backend foundation (D036): one Next.js web/API application with local PostgreSQL, SQL migrations, persistent guest/staff sessions and fictional staff/institution seed data. Use the root [startup instructions](../../README.md#running). The existing report map still uses its mock store.
- Parallel delivery (D040): workstream 1 belongs to `Rafal` (citizen/ElevenLabs), workstream 2 to `Franek` (incident response/staff), and workstream 3 to the user's machine (`agent-3`: search, decision-maker, worker and Scaleway). Use the [delivery index and repo-local skill](parallel-delivery.md); GitHub Issues/PRs carry dependencies and handoffs.
- Search clarification (D037): index reports, incidents and service tickets, with server-scoped text projections. The [Qdrant guide](qdrant-search.md) defines identities and visibility; integration remains pending.
- Selected citizen scenarios: broken lift (5), dangerous pothole (3), blocked drain (2) and power outage (1). Canonical report scripts and reuse guidance for manual testing and demo videos are in [Citizen use cases](citizen-use-cases.md). Selection does not imply that the scenarios have been executed or their workflows implemented.

## Working assumptions

- Web app, usable on phones and desktops.
- Light or dark follows the OS setting; the map settings control overrides it.
- City reports shown in the HTML preview are only a presentation example, not an approved product scope.
- The feature specification adopts a street outage plus apartment-only counterexample, one active institution ticket per incident, and explicit grouping/publication rules as reversible PoC defaults. PostgreSQL now stores foundation identities/sessions locally; incident persistence and polling remain planned.

## To be decided

- ElevenLabs account access, configured voice/agent/model, retention settings and live conversation validation.
- Institution responsibility data, service observations and ticket connector contracts; real access is not established.
- Scaleway resource/runtime choice, deployment owner and primary-store provisioning; matching, public visibility and refresh defaults are specified and need implementation verification.
- Provider capacity and the team's concrete time constraints. Local startup and a production image/configuration path exist; Scaleway selection does not establish whether Qdrant remains in Free Cloud or is hosted on Scaleway.

## Implementation-readiness review — 2026-10-03

The feature specification and API contract agree on the main response loop. The current report-map behavior and the root platform vision are explicitly separate scopes, not competing requirements. New resident reports requiring a category and search accepting uncategorized source records are also intentional.

Follow-up foundation work resolves the architecture wording, search corpus, session wire contracts and local startup gaps. The [API contract](../api-contract.md) now specifies report `version`/`expected_version` semantics for later domain mutations. Location lookup and official workflow payloads remain with their dependent implementation slices.

Still open: the supervised worker when durable triage/indexing is implemented; ElevenLabs account-wide conversation capacity; Qdrant hosting and dense inference; Scaleway resource sizing, proxy and deployment. Local checks do not establish 15–30-user capacity or provider performance.

## Delivery status

Location preparation for #26 adds a bounded Photon HTTP/client adapter and explicit address-candidate selection with an exact-pin fallback; see [location resolution](../location-resolution.md). It preserves the legacy report form/map. Owned draft, revision confirmation and persistent intake remain blocked by their shared-contract/intake dependencies; preparation does not complete the citizen workflow.

Done: project guidance, design system and a Next.js map PoC with categories, search, report form and confirmations, still fed by mock report routes. The local backend foundation adds Docker startup, PostgreSQL migrations, persistent authentication, demo staff/institutions and health/access-check APIs; newly issued sessions last 30 days. Missing: persistent reports/incidents, voice, search integration, actor tools, worker, operator approvals, institution tickets, cross-screen updates and Scaleway deployment. The [parallel-delivery backlog](parallel-delivery.md) now assigns these implementation slices; creating Issues does not implement them.

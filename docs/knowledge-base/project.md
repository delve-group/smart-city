# Project context

Updated: 2026-10-03.

## Confirmed

- Project: Smart City, built under hackathon conditions. Current phase: proof of concept.
- Delivery speed matters a lot. Code should stay modular and easy to maintain and scale.
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
- Hosting owner and primary-store provisioning; matching, public visibility and refresh defaults are specified and need implementation verification.
- Deployment conditions and the team's concrete time constraints.

## Delivery status

Done: agent rules, knowledge base, architecture, design system, HTML preview and a Next.js PoC — a full-screen map of resident reports in Kraków (MapLibre + OpenFreeMap) with a heatmap of resident reports, category filter, search (reports + places via Photon), hover tooltips, a detail panel and a report flow (pin placement + form), "I'm affected too" confirmations, fed by a mock backend (`/api/categories`, `/api/reports`, in-memory store). The ElevenLabs voice and incident feature is specified, not implemented. Missing: separate incidents, persistent storage, voice, actor tools, operator approvals, institution tickets, cross-screen updates and real city-service integrations.

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
- Voice/incident direction (2026-10-03): a report is one resident observation; an incident aggregates related reports and tracks the response. The proposed roles are dispatcher, decision-maker and institution, with official approval before external contact or ticket execution. Browser voice is the confirmed first channel; a phone number comes later. Government identity is a demo mock. Research, proposed tools and unresolved implementation choices are in the [discovery draft](../plans/2026-10-03-voice-incident-design.md).
- Agent and MCP ticket/incident search: provider and scope accepted in D029; implementation is pending. Read the [Qdrant search guide](qdrant-search.md), including its handling of uncategorized source records, before implementing search.

## Working assumptions

- Web app, usable on phones and desktops.
- Light or dark follows the OS setting; a toggle next to search overrides it.
- City reports shown in the HTML preview are only a presentation example, not an approved product scope.

## To be decided

- The single most important demo scenario for the jury (proposal: a street-light and power outage cluster in one district, reported by several residents and confirmed on the map).
- Voice provider and available account access; the draft recommends a short GPT-Live/ElevenLabs evaluation.
- Institution responsibility data, service observations and ticket connector contracts; real access is not established.
- Hosting and persistence selection, incident matching rules, public visibility and refresh behavior.
- Deployment conditions and the team's concrete time constraints.

## Delivery status

Done: agent rules, knowledge base, architecture, design system, HTML preview and a Next.js PoC — a full-screen map of resident reports in Kraków (MapLibre + OpenFreeMap) with a heatmap of resident reports, category filter, search (reports + places via Photon), hover tooltips, a detail panel and a report flow (pin placement + form), "I'm affected too" confirmations, fed by a mock backend (`/api/categories`, `/api/reports`, in-memory store). Voice and incident discovery is documented, not implemented. Missing: separate incidents, persistent storage, voice, actor tools, operator approvals, institution tickets, cross-screen updates and real city-service integrations.

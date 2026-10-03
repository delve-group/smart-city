# Project context

Updated: 2026-10-03.

## Confirmed

- Project: Smart City, built under hackathon conditions. Current phase: proof of concept.
- Delivery speed matters a lot. Code should stay modular and easy to maintain and scale.
- UI base: Appica UI (`@appica/ui-react`). Two themes: a futuristic one inspired by agent.sh and a calm, official one inspired by mObywatel/gov.pl.
- Verification rules are defined only in [AGENTS.md](../../AGENTS.md). No tests during the PoC phase.
- All documentation, code and UI copy are written in English.
- Kraków has publicly published official map services (MSIP and GUGiK). The identified sources and pre-integration checks are described in the [geospatial data note](geospatial-data.md).
- First feature: an interactive map showing a heatmap of events that will come from an API (mocked for now).

## Working assumptions

- Web app, usable on phones and desktops.
- Civic is the default theme; it can be changed with a single attribute. Signal remains an equal alternative.
- City reports shown in the HTML preview are only a presentation example, not an approved product scope.

## To be decided

- The main user and the single most important demo scenario.
- The real events API: owner, format, authentication and limits.
- Whether the demo needs persistence, a backend or live updates.
- Deployment conditions and the team's concrete time constraints.

## Delivery status

Done: agent rules, knowledge base, architecture, design system, HTML preview and a Next.js PoC — a full-screen heatmap of events in Kraków (MapLibre + OpenFreeMap) fed by a mock `/api/events` endpoint. Missing: backend, real events API and integration with city services.

# Resident incident map

Workstream 1 / Rafal, [#28](https://github.com/delve-group/smart-city/issues/28). The public projection is fixed in [workflow contracts §2 and §4](workflow-contracts.md#public-incident); Franek owns its PostgreSQL producer and contribution rules.

## Integrated behavior

The complete map uses the strict `PublicIncident` allowlist for its data hook, markers/heat, local incident/place search, category counts, tooltips, detail, nearby list and affected action. Assessment and response are separate; timeline text comes from the producer's public templates. Private narratives, unit details, resident/session IDs and internal notes are not accepted by the schema. Corroboration is not official verification, and a highlighted place is a location reference, not a measured outage boundary. Density reflects distinct support only; finished incidents remain searchable and visible as history.

`GET /api/categories` now returns the same API-defined catalogue in the common `{ data, correlation_id }` envelope. All category clients, including staff screens, use that shape. The old raw public `GET /api/reports` and report-confirmation route return `410 endpoint_retired` so stale clients reload. Canonical owned-draft submission and authorized private report lookup are unchanged. The old in-memory report feed and browser counter/membership code are removed.

The browser displays server `viewer_support` and applies the contribution result without inventing counter arithmetic. The guest endpoint restores the existing resident before writing; a reporter or previous contributor is already counted. No real support membership lives in localStorage. Three-second visible-tab polling pauses hidden tabs, aborts obsolete requests, rejects responses older than an own write, and retains last-known data with age/retry feedback after failure. Incoming updates do not own or clear intake fields. Own submission/support writes trigger refresh. The PoC reads at most five pages of 200 incidents; it reports an incomplete-list error rather than silently showing partial counts.

The user-location dot and database-free `dev:ui` remain. Mock incidents project the operations fixtures field by field with explicit fictional report-to-reporter links; old counters are not converted to identities. Only this labelled browser preview stores fictional support locally, independently of server sessions. It cannot publish a persistent incident.

## Manual verification

Real local PostgreSQL (migrations 001–007), authenticated fictional resident, live Photon and Chromium on 2026-10-03:

- Public/category envelopes and separate status/timeline rendering passed; no private fields and no legacy-map requests were observed.
- A new supporter and repeated action returned the same server membership/count. Two real submitted reports from one identity were grouped by the real worker into `INC-26-000203`; both reports and repeated affected actions still counted as one supporter, with reporter membership.
- A controlled demo status/event change appeared after 1,467 ms. This is a local source-update observation, not the full institution response rehearsal.
- A controlled 503 retained the selected incident/status with stale/retry feedback. No incident requests occurred during 6.6 seconds of hidden-tab visibility; visible refresh resumed. Private unsaved title/observation survived incoming refresh.
- A resolved incident stayed in detail/history and a new identity received `409 incident_closed`. Both obsolete routes returned `410 endpoint_retired`.
- Keyboard search selection and 390/1440 px light/dark views were reviewed; mobile had no page overflow. Early selection now waits for map load before applying focus.
- After integrating the bilingual UI and mobile brand, the real-data mobile smoke check passed retained stale details, category counts/filtering and live geographic search (two Photon results and keyboard selection). The mock preview made no backend requests, restored fictional membership on reload, and passed English/Polish controls at 390 px without overflow.

Lint, typecheck and production build pass. The final cross-screen institution acknowledgement → work → resolution timing and deployed capacity rehearsal remain [#35](https://github.com/delve-group/smart-city/issues/35). No automated tests were added. Search backend integration follows in #33; this slice preserves local incident/place matching.

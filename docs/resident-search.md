# Resident search

Workstream 1 / Rafal, #33. The browser reuses `GET /api/search/records` and the [existing search contract](workflow-contracts.md#search-query-wire-contract), with no ranking or backend permission changes.

The map popup offers Mixed (hybrid), Meaning (semantic) and Keywords. Category choices apply to backend requests and map fallback. Search results preserve backend ordering and source IDs; displayed details are joined to the current strict public incident projection. Scores, private report text and ticket text are not rendered. Missing current map details produce incomplete-search feedback while visible-map polling catches up.

The resident search request uses `credentials: omit`: an existing official/institution cookie cannot make this view request staff search. Only incident result kinds pass the client schema. Geographic place search is independent. Three-character queries are debounced by 300 ms; query/mode/category changes abort old requests and exclude their responses. Queries shorter than three characters retain existing local map matching.

Unavailable search and stale indexing have separate feedback/retry and explicitly labelled local map matches. Empty ready results have their own message. Place failures have their own retry. The mocks-only preview makes no search API call and labels its local example matching; it does not simulate semantic ranking.

## Local verification

Real Docker/PostgreSQL/Qdrant/worker and Chromium, 2026-10-03:

- Polish paraphrases `nie ma prądu na ulicy Dietla` and `bez światła na Dietla` retrieved the Dietla public incident. Hybrid and semantic selection worked; keyboard selection opened a public incident panel. A warm hybrid API request took 0.213 s; this is one observation, not a capacity measurement.
- Stopping Qdrant produced real API 503 and the browser's unavailable message, local Dietla match and live Photon place result. Restart/retry restored backend results.
- With the worker paused, a real new resident contribution changed `INC-26-000201` to four supporters; replay stayed at four. The resulting stale index response omitted that old indexed hit, displayed incomplete-search feedback and preserved the current incident through labelled map matching. The worker was resumed afterward.
- Anonymous requests explicitly requesting private reports/tickets returned zero results. A water-category request returned only water incident results. Public access revocation/current-version hydration remain enforced by the existing backend; its full source-change evidence is in the [Qdrant guide](knowledge-base/qdrant-search.md).
- A nonexistent keyword produced the separate zero-match message. Keyword/hybrid/semantic controls and the nested mode selector worked. Light/dark views at 390/1440 px were visually checked. The UI-only preview rendered its labelled local Dietla match without a database/search provider.

Lint, typecheck and production build passed. Request cancellation/key guards were reviewed; no deterministic reversed-response network injection was performed. Public source revocation has backend acceptance evidence, rather than a new browser mutation in this slice.

The complete voice/status/capacity rehearsal remains #35. No deployment or automated tests are claimed by this slice.

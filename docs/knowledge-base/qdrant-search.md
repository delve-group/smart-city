# Report, incident and service-ticket search with Qdrant

Updated: 2026-10-03. Status: source-aware HTTP search, durable indexing, reconciliation and Compose integration implemented. Native Linux checks verified the production route and 1,000-source indexing; remaining verification limits are recorded below for [#32](https://github.com/delve-group/smart-city/issues/32).

## Decision and scope

Use **Qdrant** when implementing semantic search for agents, an MCP tool that searches reports/incidents/tickets, related-record retrieval, or the shared search backend for users. The accepted corpus is **all reports, incidents and service tickets**, using titles/summaries, descriptions and permitted metadata. Interpret the earlier **1,000-ticket** demo bound as **1,000 logical source records in total across those three kinds**; separately scoped projections may create more index points. Categories and tags may be missing; retrieval must work from content alone.

This note is the implementation reference for D029, D037 and D050. PostgreSQL is authoritative; Qdrant is rebuildable. `apps/frontend/src/server/search` supplies provider primitives and source-aware retrieval/indexing, while [workflow contracts §9](../workflow-contracts.md#9-search-source-projections) owns source shapes. The current UI search and mock report backend have not been migrated. Search accepts uncategorized records even though the map/report flow requires API-defined categories.

## Record identity and access

Every indexed source has `record_type` (`report`, `incident` or `service_ticket`) and its opaque `record_id`. UUID v5 point identity includes that pair and its audience; institution audiences also include `institution_id`. Versions do not change point identity. Payload records `source_version`, indexing time and index revision. `replaceRecord(SearchSource)` replaces all current projections and removes obsolete audiences; an empty projection list or `deleteRecord(SourceRef)` removes that source. The integration caller must serialize per-source work and reload authoritative state; Qdrant does not enforce domain version checks.

| Record | Search text | Permitted audience |
| --- | --- | --- |
| `report` | Title/operator summary and original description permitted for this scope; no credentials, raw audio or full transcript. | Official/authorized decision-maker only in the current search contract. No private resident search surface is implemented. Never public search. |
| `incident` | Title/summary, description and relevant permitted metadata. Public projection uses only approved public summary/location. | Public callers receive publishable incident projections; scoped staff can search the permitted operational projection, including unpublished incidents. |
| `service_ticket` | Approved ticket title/summary and description, status and permitted incident context. | Authorized staff and the assigned institution. No reporter identities or private narratives in institution results. |

Mandatory audience/institution filters apply before ranking, including both hybrid branches and the [BM25 IDF corpus](https://qdrant.tech/documentation/manage-data/multitenancy/#per-tenant-idf-statistics). Public vectors come only from public incident text. Payload contains identity/access metadata, classification and location, not raw narratives. The provider returns candidate IDs, versions, timestamps and scores only. Before exposing results, `searchRecords` hydrates from PostgreSQL and rechecks current access, deletion and version; stale candidates must never bypass a changed permission or publication decision. A model-supplied role or filter cannot grant access.

## Implemented provider

One Qdrant collection has named `dense` (384-dimensional cosine) and `lexical` (BM25 with IDF) vectors. `search(audience, options)` supports `keyword`, `semantic` and RRF `hybrid`; `related(audience, source, limit)` reuses the current permitted stored dense vector and excludes every projection of the source record. Limits are 1–50 results and 1,000 query characters. Keyword mode does not load the embedding model. Type, category and issue-type filters are optional; §9 currently supplies no tags/status fields, so those planned filters await a producer contract extension.

The server validates collection vector settings and a `mradar_index_revision` metadata manifest before reads/writes. Setup also rejects points with a different or missing revision. An incompatible collection produces `index_incompatible`, never an apparently empty success; setup does not reset it or stamp an unknown collection. Set a new `QDRANT_COLLECTION` and rebuild from authoritative source records when model/preprocessing changes. `search:rebuild` queues a source-driven reconciliation sweep against the configured compatible collection; it never resets live data.

Provider errors are safe and distinguish unavailable/busy/incompatible/stale from an empty result. The HTTP route maps invalid input to `400 invalid_request` and provider/configuration failures to safe `503 dependency_unavailable`; authorized stale results instead use the success payload's `index_stale` state. Setup retries transient provider failures up to five times; invalid configuration, incompatible revisions and permanent HTTP errors fail immediately.

Scoped MCP tool contract (see the [module guide](../../apps/frontend/src/server/mcp/README.md) for credentials and current verification):

```ts
search_tickets({ q, mode: "hybrid", limit: 10, category_id: [], issue_type: [], record_type: [] })
find_related_tickets({ related_type, related_id, limit: 10, category_id: [], issue_type: [], record_type: [] })
get_search_record({ record_type, record_id })
```

The original search tool names are retained; they search all three source kinds. Return structured records with `record_type`, `record_id`, title, a safe excerpt, available metadata, ranking score and index freshness. Validate arguments and bound result counts. Distinguish an empty result from an unavailable index. Scores are ranking signals, not probabilities; calibrate any relevance cutoff on representative reports. Related-record search should reuse the stored dense vector for the permitted projection and exclude every projection of the source record.

## Model and language

Pinned runtime: Qdrant server `1.19.1`, `@qdrant/js-client-rest` `1.19.0`, `@huggingface/transformers` `4.3.0`, Node 22.14+ (Docker: 24.13.1). Dense inference runs locally on CPU using [`Xenova/multilingual-e5-small`](https://huggingface.co/Xenova/multilingual-e5-small), revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, q8 ONNX weights, mean pooling and normalized vectors. Queries use `query: ` and documents `passage: `, including Polish, following the [E5 model requirements](https://huggingface.co/intfloat/multilingual-e5-small).

Qdrant performs native [`qdrant/bm25`](https://qdrant.tech/documentation/inference/inference-bm25/) inference. Ingestion/query use identical language-neutral settings: no stemming, no stopword removal, multilingual tokenizer and ASCII folding. This supports the checked `pradu`/`prądu` example but does not promise Polish inflection, typo or autocomplete handling.

Each process lazily loads its model, serializes inference with at most 30 pending requests, uses two intra-op CPU threads and caches up to 100 query vectors for five minutes. Calls have a 60-second cold-model or 30-second warm-operation deadline, including queue wait. A timed-out native operation retains its serialization slot until it settles; no second inference starts alongside it and its late result cannot write the index. Further inference fails promptly while that operation remains stuck, so the worker can continue triage/execution. Restart the app/worker process if the native operation never settles, then run setup and rebuild to recover exhausted work. No per-query LLM call is involved. E5 truncates input to 512 tokens; current projection bounds are a 200-character title and 8,000-character text. BM25 sees the full bounded text, but dense retrieval may miss material beyond the model window. Assess shortening/chunking against real aggregated incident content during source integration.

## Source-aware API and reconciliation

`GET /api/search/records` and the reusable `searchRecords(ctx, input)` service use the [exact query/result contract](../workflow-contracts.md#search-query-wire-contract). Text mode is keyword, semantic or hybrid; related search uses the current permitted stored dense vector. Both accept type/category/issue filters. Anonymous/resident callers rank public incidents, officials rank operational projections, and institutions rank only their assigned tickets. There are no client-selected roles or raw provider candidates in responses. The response window is capped at 50 items, titles at 200 characters and excerpts at 240; `next_cursor` is always null.

Hydration requires exact current source-version equality and current domain permission. Missing/unauthorized candidates are omitted without a dropped count. Authorized version mismatches and an unindexed related source yield `index_stale`. A bounded diagnostic also inspects up to 32 identities from the latest unfinished index work per source, scoped by audience and reauthorized through hydration; it exposes no queue counts. `ready` means no staleness found in that bounded check, not a frozen or exhaustive corpus snapshot.

The existing single worker is the only application writer to Qdrant. Its `index` handler reloads current report, incident or ticket text, replaces all projections or removes a genuinely deleted source, then rechecks the source version. A source change during inference leaves work pending; its transactional mutation work also supplies catch-up. Older events never replay stored narrative snapshots. Source writes and intake stay independent of providers. After successful current-version reconciliation, older queued/failed index status for that source is marked reconciled while attempt history remains.

`search:rebuild` enumerates all three source kinds and Qdrant identities, deduplicates typed IDs and enqueues fresh run-specific work in batches of 100. Including indexed IDs repairs deletions as well as missing/failed indexing. Only the worker performs writes, so a sweep cannot race it with direct provider updates. The sweep caps at 10,000 unique sources and 200 index pages; all provider reads happen outside enqueue transactions. Concurrent inserts behind a UUID cursor are covered by their normal mutation work. Command success reports **queued**, not finished, reconciliation; interrupted runs can safely be repeated with a new run ID.

## Local setup and recovery

The root `npm run dev` starts the database, application, worker and private Qdrant, attempts collection/model setup, and queues reconciliation after core readiness. No cloud account or search secret is required. Initial warmup downloads about 130 MiB; app, worker and setup share the persistent writable model-cache volume. Qdrant and PostgreSQL have no published host ports in the normal stack. Ordinary shutdown retains their volumes.

A transient provider/model outage leaves intake and core services ready and prints a search-degraded result. Deterministic invalid configuration, incompatible collection revisions and permanent provider failures stop setup with exit code 2 before deployment maintenance. Recover with:

```sh
npm run search:setup
npm run search:rebuild
docker compose exec worker npm run worker:status
```

For the deployed stack, add `-- --production` to the search commands. The [Scaleway runbook](../../deploy/README.md) defines build/setup/backup ordering and exact recovery commands. The root scripts fix the internal Qdrant URL and model-cache mount; `QDRANT_COLLECTION` is the only optional root search setting. App/worker readiness does not certify search availability. The one-shot setup process has a 120-second overall deadline and exits 1 on transient provider failure or timeout; a successful setup must be followed by reconciliation after exhausted index retries.

The independent `compose.search.yaml` remains available for isolated provider fixtures, with its own volumes and loopback port 6333. It does not synchronize the application database. For direct host development, configure the existing ignored `apps/frontend/.env.local` with the normal database/application settings plus:

```dotenv
QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION=mradar_records_v1
# Optional: QDRANT_API_KEY for an authenticated server.
# Optional: SEARCH_MODEL_CACHE_DIR must be an absolute path.
```

Run `npm run search:setup`, `npm run search:rebuild` and the supervised worker from `apps/frontend`. Never expose search configuration as `NEXT_PUBLIC_*`. The fixed Next.js version already externalizes `@huggingface/transformers` and `onnxruntime-node`; no browser import or custom bundling workaround is added. Real semantic and hybrid queries through the default production route passed on Linux x64 at revision `ab580dd`, including native model loading under Next.js.

## Verification and limits

Manual checks used real E5 vectors and Qdrant with labelled disposable fixtures on macOS ARM64 and Linux ARM64/Node 24.13.1. Keyword/Polish paraphrase/hybrid/related retrieval passed across all three kinds, including an incident without a ticket and an uncategorized incident. Checks covered typed-ID collisions, private-text isolation, institution filters/reassignment, category/issue filters, updates/deletions, stale related sources, invalid bounds, empty/unavailable results, collection-revision rejection and fresh-cache startup. Lint and typecheck passed in the provider image. The default Next.js production image build at search revision `75eb97f` also passed on Linux x64. That build predates integration of the report-intake, incident-triage, official-review and decision-provider changes; checks of the combined source tree follow separately.

On six logical sources/eight projections, final Linux sample times were 79 ms keyword, 55 ms semantic, 50 ms hybrid and 95 ms related. Thirty distinct concurrent hybrid queries all succeeded in 468 ms total, with about 699 MiB process RSS while other checks were running. The same complete real-provider fixture check passed on Linux x64 at revision `75eb97f`: keyword/semantic/hybrid/related samples were 56/70/66/64 ms, with 30 queries completing in 967 ms and about 687 MiB RSS. These are small-fixture observations, not a 1,000-record or 15–30-user application capacity guarantee. Budget memory separately for each web/worker process that loads the model; relevant-record ranking thresholds are not calibrated.

All three source readers are connected to the index handler and hydration service. Anonymous public reads use `ActorContext` with `kind: "anonymous"`; the explicit `decision_maker` principal can hydrate operational reports and tickets without impersonating an official session. Producers bound titles to 200 characters and private text to 8,000 characters, marking shortened excerpts. Incident aggregation includes at most the latest 32 report summaries and 32 observation labels; every report remains independently indexed. Ticket search versions combine ticket and incident versions because the projection includes incident classification, title and location. Incident mutations enqueue associated ticket projections in the same transaction; HTTP ticket commands retain their own concurrency token.

The integrated Linux x64 source at `ab580dd` passed lint, typecheck and the default Docker production build. A separate disposable PostgreSQL database and Qdrant collection held exactly 400 reports, 310 incidents and 290 tickets. The real worker indexed all 1,000 sources in 237.148 seconds with 1,000 successful attempts and no retries. Service checks verified current source versions, keyword/semantic/hybrid/related modes, Polish paraphrases, category/issue filters, public/private isolation and institution scope. Thirty concurrent distinct hybrid service queries completed in 1.600 seconds; the check process used about 708 MiB RSS afterward. A production build ran during initial indexing, so these are observed timings, not a dedicated capacity benchmark.

The actual production HTTP route passed the same query modes and related lookups for anonymous, resident, official and both institution sessions. Warm request samples were 69–303 ms; first semantic model loading took 4.129 seconds. Invalid/authority-supplying query fields were rejected, ordinary empty results remained successful, private report text and foreign ticket text were not exposed, guest sessions recovered and staff sessions exceeded 29 days with Secure/HttpOnly cookies. Requests used loopback HTTP with cookies supplied manually; this did not verify public TLS or browser cookie transport. Idle/post-query samples were approximately 561 MiB for the worker, 761 MiB for the web container and 131 MiB for Qdrant.

Controlled scratch fixtures verified the 30-second inference deadline, serialization while an expired native operation remained pending, skipping expired queued inference, discarding late results and recovery once the native operation settled. The actual setup CLI exited with its safe degraded-status message after the 120-second hard deadline (125 seconds including container startup). These fixtures did not simulate a native engine cancellation. Source-mutation/reassignment-before-reindex, deleted-source recovery, provider-outage intake continuity and the full normal startup/deployment command were not exercised in this integrated run; their implementations remain subject to those checks. No public deployment was changed.

Exact lookup by typed source ID is exported as `getSearchRecord(ctx, ref)` and uses PostgreSQL hydration without a provider call. Optional tag/status metadata still needs a producer contract; MCP transport belongs to its separate slice. The current resident search UI still uses its legacy search until its owner switches it. Follow [AGENTS.md](../../AGENTS.md) for verification; no test framework or automated test files were added.

References: [hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/), [filters versus ranked search](https://qdrant.tech/documentation/guides/text-search/).

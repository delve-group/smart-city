# Report, incident and service-ticket search with Qdrant

Updated: 2026-10-03. Status: real local provider adapter implemented and manually verified; source synchronization, search HTTP/MCP routes and deployment integration remain open in [#32](https://github.com/delve-group/smart-city/issues/32).

## Decision and scope

Use **Qdrant** when implementing semantic search for agents, an MCP tool that searches reports/incidents/tickets, related-record retrieval, or the shared search backend for users. The accepted corpus is **all reports, incidents and service tickets**, using titles/summaries, descriptions and permitted metadata. Interpret the earlier **1,000-ticket** demo bound as **1,000 logical source records in total across those three kinds**; separately scoped projections may create more index points. Categories and tags may be missing; retrieval must work from content alone.

This note is the implementation reference for D029, D037 and D045. PostgreSQL is authoritative; Qdrant is rebuildable. `apps/frontend/src/server/search` supplies provider primitives, while [workflow contracts §9](../workflow-contracts.md#9-search-source-projections) owns source shapes. The current UI search and mock report backend have not been migrated. Search accepts uncategorized records even though the map/report flow requires API-defined categories.

## Record identity and access

Every indexed source has `record_type` (`report`, `incident` or `service_ticket`) and its opaque `record_id`. UUID v5 point identity includes that pair and its audience; institution audiences also include `institution_id`. Versions do not change point identity. Payload records `source_version`, indexing time and index revision. `replaceRecord(SearchSource)` replaces all current projections and removes obsolete audiences; an empty projection list or `deleteRecord(SourceRef)` removes that source. The integration caller must serialize per-source work and reload authoritative state; Qdrant does not enforce domain version checks.

| Record | Search text | Permitted audience |
| --- | --- | --- |
| `report` | Title/operator summary and original description permitted for this scope; no credentials, raw audio or full transcript. | Official/authorized decision-maker only in the current search contract. No private resident search surface is implemented. Never public search. |
| `incident` | Title/summary, description and relevant permitted metadata. Public projection uses only approved public summary/location. | Public callers receive publishable incident projections; scoped staff can search the permitted operational projection, including unpublished incidents. |
| `service_ticket` | Approved ticket title/summary and description, status and permitted incident context. | Authorized staff and the assigned institution. No reporter identities or private narratives in institution results. |

Mandatory audience/institution filters apply before ranking, including both hybrid branches and the [BM25 IDF corpus](https://qdrant.tech/documentation/manage-data/multitenancy/#per-tenant-idf-statistics). Public vectors come only from public incident text. Payload contains identity/access metadata, classification and location, not raw narratives. The provider returns candidate IDs, versions, timestamps and scores only. Before exposing results, the pending source integration must hydrate from PostgreSQL and recheck current access, deletion and version; stale candidates must never bypass a changed permission or publication decision. A model-supplied role or filter cannot grant access.

## Implemented provider

One Qdrant collection has named `dense` (384-dimensional cosine) and `lexical` (BM25 with IDF) vectors. `search(audience, options)` supports `keyword`, `semantic` and RRF `hybrid`; `related(audience, source, limit)` reuses the current permitted stored dense vector and excludes every projection of the source record. Limits are 1–50 results and 1,000 query characters. Keyword mode does not load the embedding model. Type, category and issue-type filters are optional; §9 currently supplies no tags/status fields, so those planned filters await a producer contract extension.

The server validates collection vector settings and a `mradar_index_revision` metadata manifest before reads/writes. Setup also rejects points with a different or missing revision. An incompatible collection produces `index_incompatible`, never an apparently empty success; setup does not reset it or stamp an unknown collection. Set a new `QDRANT_COLLECTION` and rebuild from authoritative source records when model/preprocessing changes. That source-driven rebuild command is not implemented yet.

Provider errors are safe and distinguish unavailable/busy/incompatible/stale from an empty result. These internal codes are not an HTTP error contract. Setup retries transient provider failures up to five times; invalid configuration, incompatible revisions and permanent HTTP errors fail immediately.

Suggested tool contract (not implemented):

```ts
search_tickets({ query, mode: "hybrid", limit: 10, filters })
find_related_tickets({ record_type, record_id, limit: 10, filters })
```

The original tool names are retained as planned interfaces; they search all three source kinds. Return structured records with `record_type`, `record_id`, title, a safe excerpt, available metadata, ranking score and index freshness. Validate arguments and bound result counts. Distinguish an empty result from an unavailable index. Scores are ranking signals, not probabilities; calibrate any relevance cutoff on representative reports. Related-record search should reuse the stored dense vector for the permitted projection and exclude every projection of the source record.

## Model and language

Pinned runtime: Qdrant server `1.19.1`, `@qdrant/js-client-rest` `1.19.0`, `@huggingface/transformers` `4.3.0`, Node 22.14+ (Docker: 24.13.1). Dense inference runs locally on CPU using [`Xenova/multilingual-e5-small`](https://huggingface.co/Xenova/multilingual-e5-small), revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, q8 ONNX weights, mean pooling and normalized vectors. Queries use `query: ` and documents `passage: `, including Polish, following the [E5 model requirements](https://huggingface.co/intfloat/multilingual-e5-small).

Qdrant performs native [`qdrant/bm25`](https://qdrant.tech/documentation/inference/inference-bm25/) inference. Ingestion/query use identical language-neutral settings: no stemming, no stopword removal, multilingual tokenizer and ASCII folding. This supports the checked `pradu`/`prądu` example but does not promise Polish inflection, typo or autocomplete handling.

Each process lazily loads its model, serializes inference with at most 30 pending requests, uses two intra-op CPU threads and caches up to 100 query vectors for five minutes. No per-query LLM call is involved. E5 truncates input to 512 tokens; current projection bounds are a 200-character title and 8,000-character text. BM25 sees the full bounded text, but dense retrieval may miss material beyond the model window. Assess shortening/chunking against real aggregated incident content during source integration.

## Local setup

From the repository root:

```sh
docker compose -f compose.search.yaml up -d qdrant
docker compose -f compose.search.yaml run --build --rm search-setup
```

This independent `mradar-search` project publishes Qdrant only on loopback port 6333 (override `QDRANT_PORT`) and persists the index and model cache in named volumes. It does not start PostgreSQL, index application sources or change the existing app. No provider account/key is required. Initial warmup downloads about 130 MiB of model files; later starts reuse the writable model volume. `down` preserves both volumes.

For direct host setup, use the existing ignored `apps/frontend/.env.local`, then run `npm run search:setup` from `apps/frontend`:

```dotenv
QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION=mradar_records_v1
# Optional: QDRANT_API_KEY for an authenticated server.
# Optional: SEARCH_MODEL_CACHE_DIR must be an absolute path.
```

Search validates its configuration when used; unrelated application startup does not require these variables. Never expose them as `NEXT_PUBLIC_*`. The standalone Compose setup uses its own internal Qdrant URL. Adding Qdrant/model volumes to the normal app/worker and [Scaleway stack](../../deploy/README.md) remains deployment integration work; this loopback-only development file is not a production deployment configuration. Cloud Qdrant is an optional future alternative, not a required account or a provisioned service.

## Verification and remaining integration

Manual checks used real E5 vectors and Qdrant with labelled disposable fixtures on macOS ARM64 and Linux ARM64/Node 24.13.1. Keyword/Polish paraphrase/hybrid/related retrieval passed across all three kinds, including an incident without a ticket and an uncategorized incident. Checks covered typed-ID collisions, private-text isolation, institution filters/reassignment, category/issue filters, updates/deletions, stale related sources, invalid bounds, empty/unavailable results, collection-revision rejection and fresh-cache startup. Lint and typecheck passed in the provider image; the production Next build remains pending after integration with current main.

On six logical sources/eight projections, final Linux sample times were 79 ms keyword, 55 ms semantic, 50 ms hybrid and 95 ms related. Thirty distinct concurrent hybrid queries all succeeded in 468 ms total, with about 699 MiB process RSS while other checks were running. These are small-fixture observations, not a 1,000-record or 15–30-user application capacity guarantee. Budget memory separately for each web/worker process that loads the model; relevant-record ranking thresholds are not calibrated.

Issue #32 stays open for transactional index-handler registration; real per-kind source readers; hydration/version/access checks while the index is stale; exact PostgreSQL lookup; source-driven rebuild/reconciliation; HTTP/MCP adapters and cursor/error mapping; optional tag metadata; and deployed runtime validation. The proposed anonymous `SearchReadContext` extension is coordinated on #32 and awaits the source owner's contract update. Public search must not invent an authenticated actor. Register indexing only for implemented source kinds; an unavailable reader must not be mistaken for a deleted record. Source hydration must explicitly permit the authorized decision-maker principal before agent retrieval is connected. Follow [AGENTS.md](../../AGENTS.md) for verification; no test framework or automated test files were added.

References: [hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/), [filters versus ranked search](https://qdrant.tech/documentation/guides/text-search/).

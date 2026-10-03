# Report, incident and service-ticket search with Qdrant

Updated: 2026-10-03. Status: provider decision accepted; integration, cloud provisioning and performance verification pending.

## Decision and scope

Use **Qdrant** when implementing semantic search for agents, an MCP tool that searches reports/incidents/tickets, related-record retrieval, or the shared search backend for users. The accepted corpus is **all reports, incidents and service tickets**, using titles/summaries, descriptions and permitted metadata. Interpret the earlier **1,000-ticket** demo bound as **1,000 logical source records in total across those three kinds**; separately scoped projections may create more index points. Categories and tags may be missing; retrieval must work from content alone.

This note is the implementation reference for decision D029 and the subsequent corpus clarification. Qdrant is the rebuildable search index; PostgreSQL is the authoritative application store. The local backend foundation provides PostgreSQL/authentication but no report/incident/ticket persistence or Qdrant integration yet. The current UI search and mock report backend have not been migrated. Search must accept uncategorized records even though the current map/report flow requires API-defined categories; adapt the search boundary without silently dropping these records or changing the map contract.

## Record identity and access

Every indexed source has `record_type` (`report`, `incident` or `service_ticket`) and its opaque source `record_id`. That pair is the stable application identity; two record kinds may have the same ID string. Derive a deterministic Qdrant-compatible point ID from the pair and projection kind, and preserve the original fields in payload. Record `source_version` and indexing time for reconciliation. Index records before any ticket approval when their source record exists; search must find reports and incidents that have no service ticket yet.

| Record | Search text | Permitted audience |
| --- | --- | --- |
| `report` | Title/operator summary and original description permitted for this scope; no credentials, raw audio or full transcript. | Owning resident where a private search surface exists, and authorized staff/decision-maker. Never public search. |
| `incident` | Title/summary, description and relevant permitted metadata. Public projection uses only approved public summary/location. | Public callers receive publishable incident projections; scoped staff can search the permitted operational projection, including unpublished incidents. |
| `service_ticket` | Approved ticket title/summary and description, status and permitted incident context. | Authorized staff and the assigned institution. No reporter identities or private narratives in institution results. |

Apply mandatory server-derived audience, ownership and institution filters before ranking. Keep any public vector/text projection separate from restricted text; public ranking and excerpts must not derive from private narratives. After retrieval, hydrate from PostgreSQL and recheck current access, deletion and version before returning a result. Stale index text cannot bypass a changed permission or publication decision. Return safe source text for the caller's projection, not unrestricted payload text. A model-supplied role, institution or filter cannot expand access.

## Implementation direction

1. Start with one collection with a dense vector for semantic search, a sparse BM25 vector for ranked keyword search, and payload containing the record identity, projection kind, title, description, access fields and available metadata. Start with one point per short permitted record projection; verify model input limits before indexing longer reports.
2. Index permitted title/summary and description as the primary content. Store optional category, tags, status, timestamps and location as metadata. Apply category/tag filters only when explicitly requested so unclassified records remain discoverable; access filters are always mandatory.
3. Generate vectors on initial ingestion and content changes. Use the stable record/projection identity above and synchronize updates/deletions. Persist indexing work alongside the source write when that workflow is implemented. Keep model identity and text preprocessing consistent between ingestion and queries; rebuild vectors when they change.
4. Implement a shared backend search function with `keyword`, `semantic` and `hybrid` modes. Use BM25 for ranked keyword results, dense vectors for meaning, and Qdrant Query API fusion (initially RRF) for hybrid results. Full-text payload filters narrow results but do not replace BM25 ranking. Exact lookup uses the `(record_type, record_id)` pair in the authoritative source store.
5. Wrap that function in agent tools or MCP when needed; let UI endpoints reuse it. Keep Qdrant credentials server-side. Enforce the caller's access scope before returning results.

Suggested tool contract (not implemented):

```ts
search_tickets({ query, mode: "hybrid", limit: 10, filters })
find_related_tickets({ record_type, record_id, limit: 10, filters })
```

The original tool names are retained as planned interfaces; they search all three source kinds. Return structured records with `record_type`, `record_id`, title, a safe excerpt, available metadata, ranking score and index freshness. Validate arguments and bound result counts. Distinguish an empty result from an unavailable index. Scores are ranking signals, not probabilities; calibrate any relevance cutoff on representative reports. Related-record search should reuse the stored dense vector for the permitted projection and exclude every projection of the source record.

## Models, language and latency

Initial model candidates are Qdrant Cloud's free `intfloat/multilingual-e5-small` (384 dimensions) and `qdrant/bm25`. Confirm current availability in the cluster's Inference tab. Evaluate the dense model on Polish descriptions and paraphrases before accepting it. Follow its query/document preprocessing requirements, including prefixes where required by the inference path.

BM25 defaults to English stemming and stopword removal. Configure preprocessing for the actual language and supported options, consistently at ingestion and query time; avoid assuming Polish inflections, typos or autocomplete are handled automatically. See [BM25 documentation](https://qdrant.tech/documentation/search/text-search/full-text-search/).

For 1,000 logical source records, begin with simple collection settings and measure before tuning indexes. Precompute document embeddings, cache repeated query embeddings with model-aware invalidation, and avoid an LLM rewrite/rerank call on every search. Keyword-only retrieval needs no dense embedding inference.

Measure end-to-end latency separately for keyword, semantic, hybrid and related-ticket queries, including embedding time, networking and concurrent agents. No latency target or benchmark has been established. Free Cloud embedding models run in the US even for EU clusters; if that dominates latency, generate compatible embeddings near the backend and send vectors to Qdrant. See [Cloud inference and model availability](https://qdrant.tech/documentation/cloud/inference/).

## Free Cloud setup

Provider facts checked on 2026-10-03; recheck the linked documentation when provisioning.

1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io/).
2. Open **Clusters → Create**, select **Free**, and choose an available region near the backend. Confirm the free configuration before creating it. No credit card is required for the free tier.
3. Once ready, copy the cluster HTTPS endpoint from its details.
4. Open the cluster's **API Keys → Create**. Create a Database API key with manage/write access for collection setup and ingestion; save it when displayed. Use a separate read-only key for search once the collection exists. A Cloud management key is not the database connection key.
5. Check the **Inference** tab for the free model candidates above. New clusters have inference enabled by default. The collection and indexes should be created by the implementation so dimensions and named vectors agree with the code.
6. Store connection values in the backend's ignored local environment file or deployment secrets. Proposed names, not yet wired into code:

```dotenv
QDRANT_URL=https://<cluster-endpoint>
QDRANT_API_KEY=<database-api-key>
QDRANT_COLLECTION=tickets
```

When integrating Qdrant, add server-only variables to the ignored environment file used by the local startup workflow; follow the [README](../../README.md#running) rather than introducing a second required configuration location. These variables are not required by the current foundation. Keep real keys out of documentation, chat, Git and `NEXT_PUBLIC_*` variables. Verify connectivity using the dashboard's generated connection example; provisioning alone does not index source records.

The free tier currently offers one node, 0.5 vCPU, 1 GB RAM and 4 GB disk, without dedicated resources. It should fit this dataset, but capacity is not a latency guarantee. Inactive clusters suspend after one week and are deleted after four weeks if not reactivated; keep source records available to rebuild the index. See [cluster setup and limits](https://qdrant.tech/documentation/cloud/create-cluster/) and [Database API keys](https://qdrant.tech/documentation/cloud/authentication/).

## Completion criteria for a future implementation

Demonstrate keyword and paraphrase retrieval across representative Polish reports, incidents and service tickets, including an incident with no approved ticket, retrieval without category/tags, explicit metadata filters, related-record retrieval, update/delete synchronization, and empty/error responses. Verify that public queries cannot discover private text and each institution sees only assigned tickets, including after source permissions change. Record measured latency and unresolved relevance issues. Follow the repository verification policy; this note adds no automated-test requirement.

References: [hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/), [filters versus ranked search](https://qdrant.tech/documentation/guides/text-search/).

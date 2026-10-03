# Ticket and incident search with Qdrant

Updated: 2026-10-03. Status: provider decision accepted; integration, cloud provisioning and performance verification pending.

## Decision and scope

Use **Qdrant** when implementing semantic search for agents, an MCP tool that searches tickets or incidents, related-ticket retrieval, or the shared ticket search backend for users. The user selected Qdrant for a PoC capped at **1,000 tickets**. Categories and tags may be missing; retrieval must work from ticket content alone.

This note is the implementation reference for decision D029. Qdrant is the search index; the authoritative ticket store remains a separate backend decision. The current UI search and mock backend have not been migrated. Search must accept uncategorized records even though the current map/report flow requires API-defined categories; adapt the search boundary without silently dropping these records or changing the map contract.

## Implementation direction

1. Create one collection with a dense vector for semantic search, a sparse BM25 vector for ranked keyword search, and payload containing the source ID, title, description and available metadata. Start with one point per short ticket; verify model input limits before indexing longer reports.
2. Index title and description as the primary content. Store optional category, tags, status, timestamps and location as metadata. Apply category/tag filters only when explicitly requested so unclassified tickets remain discoverable.
3. Generate vectors on initial ingestion and content changes. Use stable Qdrant-compatible IDs, preserve the original ticket ID in payload, and synchronize updates/deletions. Keep model identity and text preprocessing consistent between ingestion and queries; rebuild vectors when they change.
4. Implement a shared backend search function with `keyword`, `semantic` and `hybrid` modes. Use BM25 for ranked keyword results, dense vectors for meaning, and Qdrant Query API fusion (initially RRF) for hybrid results. Full-text payload filters narrow results but do not replace BM25 ranking. Exact ticket-ID lookup should use the ID field.
5. Wrap that function in agent tools or MCP when needed; let UI endpoints reuse it. Keep Qdrant credentials server-side. Enforce the caller's access scope before returning results.

Suggested tool contract (not implemented):

```ts
search_tickets({ query, mode: "hybrid", limit: 10, filters })
find_related_tickets({ ticket_id, limit: 10, filters })
```

Return structured records with source IDs, titles, relevant original text, available metadata and ranking scores. Validate arguments and bound result counts. Distinguish an empty result from an unavailable index. Scores are ranking signals, not probabilities; calibrate any relevance cutoff on representative reports. Related-ticket search should reuse the stored dense vector and exclude the source ticket.

## Models, language and latency

Initial model candidates are Qdrant Cloud's free `intfloat/multilingual-e5-small` (384 dimensions) and `qdrant/bm25`. Confirm current availability in the cluster's Inference tab. Evaluate the dense model on Polish descriptions and paraphrases before accepting it. Follow its query/document preprocessing requirements, including prefixes where required by the inference path.

BM25 defaults to English stemming and stopword removal. Configure preprocessing for the actual language and supported options, consistently at ingestion and query time; avoid assuming Polish inflections, typos or autocomplete are handled automatically. See [BM25 documentation](https://qdrant.tech/documentation/search/text-search/full-text-search/).

For 1,000 tickets, begin with simple collection settings and measure before tuning indexes. Precompute document embeddings, cache repeated query embeddings with model-aware invalidation, and avoid an LLM rewrite/rerank call on every search. Keyword-only retrieval needs no dense embedding inference.

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

For Next.js route handlers, use server-only variables in `apps/frontend/.env.local`; verify it is ignored before saving credentials. Keep real keys out of documentation, chat, Git and `NEXT_PUBLIC_*` variables. Verify connectivity using the dashboard's generated connection example; provisioning alone does not index tickets.

The free tier currently offers one node, 0.5 vCPU, 1 GB RAM and 4 GB disk, without dedicated resources. It should fit this dataset, but capacity is not a latency guarantee. Inactive clusters suspend after one week and are deleted after four weeks if not reactivated; keep source records available to rebuild the index. See [cluster setup and limits](https://qdrant.tech/documentation/cloud/create-cluster/) and [Database API keys](https://qdrant.tech/documentation/cloud/authentication/).

## Completion criteria for a future implementation

Demonstrate keyword and paraphrase retrieval on representative Polish tickets, retrieval without category/tags, explicit metadata filters, related-ticket retrieval, update/delete synchronization, and empty/error responses. Record measured latency and unresolved relevance issues. Follow the repository verification policy; this note adds no automated-test requirement.

References: [hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/), [filters versus ranked search](https://qdrant.tech/documentation/guides/text-search/).

import "server-only";
import { QdrantClient, type Schemas } from "@qdrant/js-client-rest";
import { z } from "zod";
import {
  BM25_OPTIONS, EMBEDDING_DIMENSIONS, getSearchConfig, SEARCH_INDEX_REVISION,
  type SearchConfig,
} from "./config";
import { LocalEmbeddings } from "./embeddings";
import { SearchError, withSearchErrors } from "./errors";
import { projectionPointId } from "./identity";
import {
  audienceSchema, candidatePayloadSchema, searchSourceSchema, sourceRefSchema,
  searchOptionsSchema, validateSearchInput,
  type Audience, type CandidateResult, type SearchSource, type SourceRef,
  type SearchCandidate, type SearchFilters, type SearchOptions,
} from "./types";

type Filter = Schemas["Filter"];
const CANDIDATE_FIELDS = [
  "record_type", "record_id", "projection_kind", "source_version", "indexed_at", "index_revision",
];
const lexical = (text: string) => ({ text, model: "qdrant/bm25", options: BM25_OPTIONS });

function recordFilter(key: SourceRef): Filter {
  return { must: [
    { key: "record_type", match: { value: key.record_type } },
    { key: "record_id", match: { value: key.record_id } },
  ] };
}

function scopeFilter(scope: Audience): Filter {
  const must: Schemas["Condition"][] = [
    { key: "projection_kind", match: { value: scope.kind } },
    { key: "index_revision", match: { value: SEARCH_INDEX_REVISION } },
  ];
  if (scope.kind === "public") must.push({ key: "record_type", match: { value: "incident" } });
  if (scope.kind === "institution") must.push({ key: "institution_id", match: { value: scope.institution_id } });
  return { must };
}

function retrievalFilter(scope: Filter, filters: SearchFilters): Filter {
  const must: Schemas["Condition"][] = [scope];
  for (const [field, values] of [
    ["record_type", filters.recordTypes], ["category_id", filters.categoryIds],
    ["issue_type", filters.issueTypes],
  ] as const) {
    if (values) must.push({ key: field, match: { any: values } });
  }
  return { must };
}

function candidates(points: Schemas["ScoredPoint"][]): SearchCandidate[] {
  return points.map((point) => {
    const payload = candidatePayloadSchema.safeParse(point.payload);
    if (!payload.success || payload.data.index_revision !== SEARCH_INDEX_REVISION || !Number.isFinite(point.score)) {
      throw new SearchError("index_incompatible", "The search index needs a source-driven rebuild.", false);
    }
    return {
      record_type: payload.data.record_type,
      record_id: payload.data.record_id,
      projection_kind: payload.data.projection_kind,
      source_version: payload.data.source_version,
      indexed_at: payload.data.indexed_at,
      score: point.score,
    };
  });
}

/** Provider primitives only: never return these candidates directly to an HTTP caller. */
export class SearchIndex {
  private readonly client: QdrantClient;
  private readonly embeddings: LocalEmbeddings;

  constructor(private readonly config: SearchConfig = getSearchConfig()) {
    this.client = new QdrantClient({
      url: config.url, apiKey: config.apiKey, timeout: 10_000,
      maxConnections: 4, checkCompatibility: false,
    });
    this.embeddings = new LocalEmbeddings(config.modelCacheDirectory);
  }

  async warmup(): Promise<void> {
    await this.embeddings.warmup();
  }

  private async requireCompatibleCollection(): Promise<void> {
    const collection = await this.client.getCollection(this.config.collection);
    const expected = z.object({
      config: z.object({
        metadata: z.object({ mradar_index_revision: z.literal(SEARCH_INDEX_REVISION) }),
        params: z.object({
          vectors: z.object({ dense: z.object({
            size: z.literal(EMBEDDING_DIMENSIONS), distance: z.literal("Cosine"),
          }) }),
          sparse_vectors: z.object({ lexical: z.object({ modifier: z.literal("idf") }) }),
        }),
      }),
    });
    if (!expected.safeParse(collection).success) {
      throw new SearchError("index_incompatible", "The collection has incompatible vector settings or an unrecognized index revision. Use a new collection and rebuild from source.", false);
    }
  }

  /** Explicit setup; normal search must not create or silently replace a collection. */
  async setup(): Promise<void> {
    await withSearchErrors(async () => {
      const { exists } = await this.client.collectionExists(this.config.collection);
      if (!exists) {
        await this.client.createCollection(this.config.collection, {
          vectors: { dense: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" } },
          sparse_vectors: { lexical: { modifier: "idf" } },
          metadata: { mradar_index_revision: SEARCH_INDEX_REVISION },
        });
      }
      await this.requireCompatibleCollection();
      const incompatible = await this.client.count(this.config.collection, {
        exact: true,
        filter: { must_not: [{ key: "index_revision", match: { value: SEARCH_INDEX_REVISION } }] },
      });
      if (incompatible.count > 0) {
        throw new SearchError("index_incompatible", "The collection contains points from another index revision. Use a new collection and rebuild from source.", false);
      }
      for (const field of [
        "record_type", "record_id", "projection_kind", "index_revision",
        "institution_id", "category_id", "issue_type",
      ]) {
        await this.client.createPayloadIndex(this.config.collection, {
          field_name: field, field_schema: "keyword", wait: true,
        });
      }
    });
  }

  /**
   * Replace all projections of one source. The caller serializes work per source,
   * reloads its current version and supplies every currently permitted projection.
   * Empty projections remove the source. Qdrant is not the authority for version checks.
   */
  async replaceRecord(input: SearchSource): Promise<void> {
    const source = validateSearchInput(searchSourceSchema, input);
    await withSearchErrors(async () => {
      await this.requireCompatibleCollection();
      const points: Schemas["PointStruct"][] = [];
      for (const projection of source.projections) {
        const text = `${projection.title}\n${projection.text}`.trim();
        const dense = await this.embeddings.embed("passage", text);
        points.push({
          id: projectionPointId(source, projection.audience),
          vector: { dense, lexical: lexical(text) },
          payload: {
            record_type: source.record_type, record_id: source.record_id,
            projection_kind: projection.audience.kind, source_version: source.version,
            indexed_at: new Date().toISOString(), index_revision: SEARCH_INDEX_REVISION,
            updated_at: source.updated_at, category_id: source.category_id, issue_type: source.issue_type,
            ...(source.location ? { location: { lat: source.location.lat, lon: source.location.lng } } : {}),
            ...(projection.audience.kind === "institution" ? { institution_id: projection.audience.institution_id } : {}),
          },
        });
      }
      if (points.length) {
        await this.client.upsert(this.config.collection, { points, wait: true });
      }
      await this.client.delete(this.config.collection, {
        wait: true,
        filter: {
          must: [recordFilter(source)],
          ...(points.length ? { must_not: [{ has_id: points.map((point) => point.id) }] } : {}),
        },
      });
    });
  }

  async deleteRecord(input: SourceRef): Promise<void> {
    const key = validateSearchInput(sourceRefSchema, input);
    await withSearchErrors(async () => {
      await this.requireCompatibleCollection();
      await this.client.delete(this.config.collection, { wait: true, filter: recordFilter(key) });
    });
  }

  /** Mandatory caller scope is separate from optional search filters. */
  async search(scopeInput: Audience, input: SearchOptions): Promise<CandidateResult> {
    const scope = validateSearchInput(audienceSchema, scopeInput);
    const options = validateSearchInput(searchOptionsSchema, input);
    const audience = scopeFilter(scope);
    const filter = retrievalFilter(audience, options.filters);
    const started = performance.now();
    return withSearchErrors(async () => {
      await this.requireCompatibleCollection();
      const vector = options.mode === "keyword" ? undefined : await this.embeddings.embed("query", options.query);
      const common = { filter, limit: options.limit, with_payload: CANDIDATE_FIELDS };
      const response = options.mode === "hybrid"
        ? await this.client.query(this.config.collection, {
          ...common,
          prefetch: [
            { query: vector!, using: "dense", filter, limit: options.limit * 3 },
            { query: lexical(options.query), using: "lexical", filter, limit: options.limit * 3,
              params: { idf: { corpus: audience } } },
          ],
          query: { fusion: "rrf" },
        })
        : await this.client.query(this.config.collection, {
          ...common,
          query: options.mode === "keyword" ? lexical(options.query) : vector!,
          using: options.mode === "keyword" ? "lexical" : "dense",
          ...(options.mode === "keyword" ? { params: { idf: { corpus: audience } } } : {}),
        });
      return { candidates: candidates(response.points), elapsedMs: Math.round(performance.now() - started) };
    });
  }

  /** The caller authorizes the source and supplies its current authoritative version. */
  async related(scopeInput: Audience, sourceInput: SourceRef & { version: number }, limit = 10): Promise<CandidateResult> {
    const scope = validateSearchInput(audienceSchema, scopeInput);
    const source = validateSearchInput(sourceRefSchema.extend({ version: z.number().int().positive() }), sourceInput);
    validateSearchInput(z.number().int().min(1).max(50), limit);
    const id = projectionPointId(source, scope);
    const audience = scopeFilter(scope);
    const started = performance.now();
    return withSearchErrors(async () => {
      await this.requireCompatibleCollection();
      // Filtering the lookup prevents an old institution assignment from supplying a vector.
      const existing = await this.client.scroll(this.config.collection, {
        filter: { must: [audience, { has_id: [id] }] },
        limit: 1, with_payload: CANDIDATE_FIELDS, with_vector: ["dense"],
      });
      const payload = candidatePayloadSchema.safeParse(existing.points[0]?.payload);
      if (!payload.success || payload.data.source_version !== source.version) {
        throw new SearchError("index_stale", "The related-search source is not indexed at its current version.", true);
      }
      const vectors = existing.points[0]?.vector;
      const stored = vectors && !Array.isArray(vectors) ? vectors.dense : undefined;
      const vector = z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS).safeParse(stored);
      if (!vector.success) {
        throw new SearchError("index_stale", "The related-search vector is unavailable. Reindex the source.", true);
      }
      const response = await this.client.query(this.config.collection, {
        query: vector.data, using: "dense", limit,
        filter: { must: [audience], must_not: [recordFilter(source)] },
        with_payload: CANDIDATE_FIELDS,
      });
      return { candidates: candidates(response.points), elapsedMs: Math.round(performance.now() - started) };
    });
  }
}

let searchIndex: SearchIndex | undefined;
export function getSearchIndex(): SearchIndex {
  return searchIndex ??= new SearchIndex();
}

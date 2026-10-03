import "server-only";
import { createHash } from "node:crypto";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import {
  EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_REVISION, SEARCH_INDEX_REVISION,
} from "./config";
import { SearchError, withSearchErrors } from "./errors";

const MAX_WAITING = 30;
const MAX_CACHE_ENTRIES = 100;
const CACHE_LIFETIME_MS = 5 * 60_000;
const COLD_OPERATION_MS = 60_000;
const WARM_OPERATION_MS = 30_000;

/** A lazy CPU model for the singleton search adapter; inference calls are serialized. */
export class LocalEmbeddings {
  private model?: Promise<FeatureExtractionPipeline>;
  private modelReady = false;
  private timedOutOperation = false;
  private tail: Promise<void> = Promise.resolve();
  private waiting = 0;
  private readonly cache = new Map<string, { vector: number[]; expiresAt: number }>();

  constructor(private readonly cacheDirectory: string) {}

  private load(): Promise<FeatureExtractionPipeline> {
    if (!this.model) {
      this.model = withSearchErrors(async () => {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.cacheDir = this.cacheDirectory;
        const model = await pipeline("feature-extraction", EMBEDDING_MODEL, {
          revision: EMBEDDING_REVISION,
          dtype: "q8",
          device: "cpu",
          session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
        });
        this.modelReady = true;
        return model;
      }).catch((error) => {
        this.model = undefined;
        this.modelReady = false;
        throw error;
      });
    }
    return this.model;
  }

  async warmup(): Promise<void> {
    await this.embed("query", "Demo city infrastructure issue");
  }

  async embed(kind: "query" | "passage", text: string): Promise<number[]> {
    if (!text.trim() || text.length > 8_201) {
      throw new SearchError("invalid_search_input", "Embedding text is empty or too long.", false);
    }
    const key = createHash("sha256").update(SEARCH_INDEX_REVISION).update(kind).update(text).digest("hex");
    const cached = kind === "query" ? this.cache.get(key) : undefined;
    if (cached && cached.expiresAt > Date.now()) return [...cached.vector];
    this.cache.delete(key);
    if (this.timedOutOperation) {
      throw new SearchError("search_unavailable", "Search inference is still unavailable. Try again shortly.", true);
    }
    if (this.waiting >= MAX_WAITING) {
      throw new SearchError("search_busy", "Search is busy. Try again shortly.", true);
    }

    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    this.waiting += 1;
    let expired = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        if (running) this.timedOutOperation = true;
        reject(new SearchError("search_unavailable", "Search inference timed out. Try again shortly.", true));
      }, this.modelReady ? WARM_OPERATION_MS : COLD_OPERATION_MS);
    });
    const operation = (async () => {
      try {
        await previous;
        if (expired) throw new SearchError("search_unavailable", "Search inference timed out. Try again shortly.", true);
        running = true;
        return await withSearchErrors(async () => {
          const model = await this.load();
          const result = await model(`${kind}: ${text}`, { pooling: "mean", normalize: true });
          const vector = Array.from(result.data, Number);
          if (vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) {
            throw new SearchError("search_unavailable", "The embedding model returned an invalid vector.", true);
          }
          if (kind === "query" && !expired) {
            if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
            this.cache.set(key, { vector, expiresAt: Date.now() + CACHE_LIFETIME_MS });
          }
          return [...vector];
        });
      } finally {
        // The caller may have timed out, but native inference is not cancellable.
        // Hold serialization until it actually settles; its late result is discarded.
        if (running && expired) this.timedOutOperation = false;
        this.waiting -= 1;
        release();
      }
    })();
    try { return await Promise.race([operation, deadline]); }
    finally { clearTimeout(timer!); }
  }
}

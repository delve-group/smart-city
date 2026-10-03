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

/** A lazy CPU model for the singleton search adapter; inference calls are serialized. */
export class LocalEmbeddings {
  private model?: Promise<FeatureExtractionPipeline>;
  private tail: Promise<void> = Promise.resolve();
  private waiting = 0;
  private readonly cache = new Map<string, { vector: number[]; expiresAt: number }>();

  constructor(private readonly cacheDirectory: string) {}

  private load(): Promise<FeatureExtractionPipeline> {
    if (!this.model) {
      this.model = withSearchErrors(async () => {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.cacheDir = this.cacheDirectory;
        return pipeline("feature-extraction", EMBEDDING_MODEL, {
          revision: EMBEDDING_REVISION,
          dtype: "q8",
          device: "cpu",
          session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
        });
      }).catch((error) => {
        this.model = undefined;
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
    if (this.waiting >= MAX_WAITING) {
      throw new SearchError("search_busy", "Search is busy. Try again shortly.", true);
    }

    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    this.waiting += 1;
    try {
      await previous;
      return await withSearchErrors(async () => {
        const model = await this.load();
        const result = await model(`${kind}: ${text}`, { pooling: "mean", normalize: true });
        const vector = Array.from(result.data, Number);
        if (vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) {
          throw new SearchError("search_unavailable", "The embedding model returned an invalid vector.", true);
        }
        if (kind === "query") {
          if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
          this.cache.set(key, { vector, expiresAt: Date.now() + CACHE_LIFETIME_MS });
        }
        return [...vector];
      });
    } finally {
      this.waiting -= 1;
      release();
    }
  }
}

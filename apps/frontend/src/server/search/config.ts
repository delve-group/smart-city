import "server-only";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import { ConfigurationError } from "../config";

export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const EMBEDDING_REVISION = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
export const EMBEDDING_DIMENSIONS = 384;
// A preprocessing/model change needs a new revision and a source-driven rebuild.
export const SEARCH_INDEX_REVISION = "e5-small-q8-761b726-mean-l2-prefix-bm25-neutral-v2";
export const BM25_OPTIONS = {
  stemmer: { type: "none" },
  stopwords: {},
  tokenizer: "multilingual",
  ascii_folding: true,
} as const;

const configSchema = z.object({
  QDRANT_URL: z.url().refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      && !url.username && !url.password && !url.search && !url.hash
      && url.pathname === "/";
  }),
  QDRANT_API_KEY: z.string().min(1).optional(),
  QDRANT_COLLECTION: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/).default("mradar_records_v1"),
  SEARCH_MODEL_CACHE_DIR: z.string().refine(isAbsolute)
    .default(join(homedir(), ".cache", "mradar-models")),
});

export interface SearchConfig {
  url: string;
  apiKey?: string;
  collection: string;
  modelCacheDirectory: string;
}

/** Required only by search setup/consumers; unrelated app startup stays independent. */
export function getSearchConfig(): SearchConfig {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(`Missing or invalid search environment variables: ${fields.join(", ")}.`);
  }
  return {
    url: parsed.data.QDRANT_URL,
    apiKey: parsed.data.QDRANT_API_KEY,
    collection: parsed.data.QDRANT_COLLECTION,
    modelCacheDirectory: parsed.data.SEARCH_MODEL_CACHE_DIR,
  };
}

export type SearchErrorCode =
  | "invalid_search_input"
  | "search_unavailable"
  | "search_busy"
  | "index_incompatible"
  | "index_stale";

export class SearchError extends Error {
  constructor(
    public readonly code: SearchErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

export async function withSearchErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof SearchError) throw error;
    // Provider errors can contain URLs, keys, request text or private payloads.
    const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
    if (typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      throw new SearchError("search_unavailable", "The search provider rejected the request. Check server configuration.", false);
    }
    throw new SearchError("search_unavailable", "Search is temporarily unavailable.", true);
  }
}

import { ApiError, handleApi } from "@/server/http/api";

/** Explicit migration response for stale map clients; never mutates old counters. */
export function POST() {
  return handleApi(() => { throw new ApiError(410, "endpoint_retired", "Use incident contributions. Reload the application."); });
}

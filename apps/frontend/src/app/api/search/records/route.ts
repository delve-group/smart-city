import type { NextRequest } from "next/server";
import { ConfigurationError } from "@/server/config";
import { ApiError, handleApi, success } from "@/server/http/api";
import { optionalActorContext } from "@/server/http/context";
import { SearchError } from "@/server/search/errors";
import { parseSearchQuery } from "@/server/search/request";
import { searchRecords } from "@/server/search/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => {
    try {
      const input = parseSearchQuery(request.nextUrl.searchParams);
      const ctx = await optionalActorContext(request, correlationId);
      return success(await searchRecords(ctx, input), correlationId);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw new ApiError(503, "dependency_unavailable", "Search configuration is unavailable. Contact the demo operator.");
      }
      if (error instanceof SearchError) {
        throw error.code === "invalid_search_input"
          ? new ApiError(400, "invalid_request", error.message)
          : new ApiError(503, "dependency_unavailable", error.message, error.retryable);
      }
      throw error;
    }
  });
}

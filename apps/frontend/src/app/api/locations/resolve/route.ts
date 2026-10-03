import { resolveLocationInputSchema } from "@/api/locations/types";
import { ApiError, handleApi, success } from "@/server/http/api";
import { readJson, requireAppOrigin } from "@/server/http/request";
import { resolveLocation } from "@/server/location/resolve-location";

/** Public read-only geography. Draft confirmation/submission requires resident ownership. */
export async function POST(request: Request) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const input = resolveLocationInputSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "invalid_request", "Provide a Kraków address or map pin.");
    return success(await resolveLocation(input.data, request.signal), correlationId);
  });
}

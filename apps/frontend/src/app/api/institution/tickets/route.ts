import type { NextRequest } from "next/server";
import { z } from "zod";
import { TICKET_STATUSES } from "@/api/institution/types";
import { ApiError, handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { listTickets } from "@/server/institutions/tickets";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.array(z.enum(TICKET_STATUSES)),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().max(200).nullable(),
});

/** The signed-in institution's tickets. There is no institution parameter: scope comes from the account. */
export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId, "institution");
    const search = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({ status: search.getAll("status"), limit: search.get("limit") ?? undefined, cursor: search.get("cursor") });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, "invalid_request", `${issue?.path.join(".") ?? "query"}: ${issue?.message ?? "Invalid filter."}`);
    }
    return success(await listTickets(ctx, { statuses: parsed.data.status, limit: parsed.data.limit, cursor: parsed.data.cursor }), correlationId);
  });
}

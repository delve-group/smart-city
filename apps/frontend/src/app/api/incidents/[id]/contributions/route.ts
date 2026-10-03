import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { addContribution } from "@/server/incidents/public";

export const runtime = "nodejs";

/** "I'm affected too" for the current resident: counted once, however often it is sent. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/incidents/[id]/contributions">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const { created, version, ...result } = await addContribution(ctx, (await params).id);
    return success(result, correlationId, created ? 201 : 200, version);
  });
}

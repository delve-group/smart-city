import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { optionalActorContext } from "@/server/http/context";
import { getPublicIncident } from "@/server/incidents/public";

export const runtime = "nodejs";

/** One public incident with its timeline. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/incidents/[id]">) {
  return handleApi(async (correlationId) => {
    const ctx = await optionalActorContext(request, correlationId);
    return success(await getPublicIncident(ctx, (await params).id), correlationId);
  });
}

import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { getOfficialIncident } from "@/server/incidents/workspace";

export const runtime = "nodejs";

/** Private incident detail: linked reports, evidence, proposal, ticket, history and current version. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/operations/incidents/[id]">) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId, "official");
    const incident = await getOfficialIncident(ctx, (await params).id);
    return success(incident, correlationId, 200, incident.version);
  });
}

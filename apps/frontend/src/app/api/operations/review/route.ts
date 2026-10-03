import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { getWorkspace } from "@/server/incidents/workspace";

export const runtime = "nodejs";

/** The official's workspace: review queue, incidents, staff-visible reports and institutions. */
export async function GET(request: NextRequest) {
  return handleApi(async (correlationId) => {
    const ctx = await requireActorContext(request, correlationId, "official");
    return success(await getWorkspace(ctx), correlationId);
  });
}

import type { NextRequest } from "next/server";
import { handleApi, success } from "@/server/http/api";
import { requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { endVoiceSession } from "@/server/voice/sessions";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: RouteContext<"/api/voice/sessions/[id]/end">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    return success(await endVoiceSession(ctx, (await params).id), correlationId);
  });
}

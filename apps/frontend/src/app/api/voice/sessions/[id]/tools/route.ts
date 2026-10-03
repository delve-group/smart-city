import type { NextRequest } from "next/server";
import { voiceToolSchema } from "@/api/voice/types";
import { ApiError, handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { SearchError } from "@/server/search/errors";
import { runVoiceTool } from "@/server/voice/tools";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: RouteContext<"/api/voice/sessions/[id]/tools">) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const input = await readBody(request, voiceToolSchema, 16_384);
    try {
      const result = await runVoiceTool(ctx, (await params).id, input, request.signal);
      const version = "revision" in result ? result.revision : "report" in result ? result.report.version : undefined;
      return success(result, correlationId, 200, version);
    }
    catch (error) { if (error instanceof SearchError) throw new ApiError(503, "dependency_unavailable", "Incident search is unavailable. Continue reporting or use the form.", true); throw error; }
  });
}

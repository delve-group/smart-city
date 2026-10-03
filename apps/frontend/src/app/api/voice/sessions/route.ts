import type { NextRequest } from "next/server";
import { createVoiceSessionSchema } from "@/api/voice/types";
import { ApiError, handleApi, success } from "@/server/http/api";
import { readBody, requireActorContext } from "@/server/http/context";
import { requireAppOrigin } from "@/server/http/request";
import { ConfigurationError } from "@/server/config";
import { VoiceProviderError } from "@/server/voice/provider";
import { createVoiceSession } from "@/server/voice/sessions";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handleApi(async (correlationId) => {
    requireAppOrigin(request);
    const ctx = await requireActorContext(request, correlationId, "resident");
    const input = await readBody(request, createVoiceSessionSchema);
    try { return success(await createVoiceSession(ctx, input.draft_id, request.signal), correlationId, 201); }
    catch (error) {
      if (error instanceof ConfigurationError || error instanceof VoiceProviderError) throw new ApiError(503, "voice_unavailable", "Voice is unavailable. Your report draft remains available in the form.", true);
      throw error;
    }
  });
}

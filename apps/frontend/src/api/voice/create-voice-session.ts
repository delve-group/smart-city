import { jsonBody } from "@/api/intake/request-intake";
import { requestVoice } from "./request-voice";
import { voiceSessionSchema } from "./types";

export function createVoiceSession(draftId: string, signal?: AbortSignal) {
  return requestVoice("/api/voice/sessions", voiceSessionSchema, {
    ...jsonBody("POST", { draft_id: draftId }), signal,
  });
}

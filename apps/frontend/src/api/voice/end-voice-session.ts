import { z } from "zod";
import { intakeDraftSchema } from "@/api/intake/types";
import { requestVoice } from "./request-voice";

export function endVoiceSession(sessionId: string) {
  return requestVoice(`/api/voice/sessions/${encodeURIComponent(sessionId)}/end`,
    z.object({ ended: z.literal(true), draft: intakeDraftSchema }), { method: "POST", keepalive: true });
}

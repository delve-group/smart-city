import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/server/config";

/** Voice configuration is lazy: missing provider access never disables form intake. */
export function getVoiceConfig() {
  const result = z.object({
    ELEVENLABS_API_KEY: z.string().trim().min(1),
    ELEVENLABS_AGENT_ID: z.string().regex(/^agent_[a-zA-Z0-9]+$/),
    ELEVENLABS_AGENT_VERSION_ID: z.string().trim().min(1),
  }).safeParse(process.env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(`Missing or invalid voice configuration: ${names.join(", ")}. Form reporting remains available.`);
  }
  return { apiKey: result.data.ELEVENLABS_API_KEY, agentId: result.data.ELEVENLABS_AGENT_ID, versionId: result.data.ELEVENLABS_AGENT_VERSION_ID };
}

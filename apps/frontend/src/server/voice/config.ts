import "server-only";
import { ConfigurationError } from "@/server/config";
import { voiceEnvironmentSchema } from "./environment";

/** Voice configuration is lazy: missing provider access never disables form intake. */
export function getVoiceConfig() {
  const result = voiceEnvironmentSchema.safeParse(process.env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(`Missing or invalid voice configuration: ${names.join(", ")}. Form reporting remains available.`);
  }
  return { apiKey: result.data.ELEVENLABS_API_KEY, agentId: result.data.ELEVENLABS_AGENT_ID, versionId: result.data.ELEVENLABS_AGENT_VERSION_ID };
}

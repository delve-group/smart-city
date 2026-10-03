import { z } from "zod";

/** Pure schema is shared by startup diagnostics and the server-only provider adapter. */
export const voiceEnvironmentSchema = z.object({
  ELEVENLABS_API_KEY: z.string().trim().min(1),
  ELEVENLABS_AGENT_ID: z.string().regex(/^agent_[a-zA-Z0-9]+$/),
  ELEVENLABS_AGENT_VERSION_ID: z.string().trim().min(1),
});

export function voiceConfigurationIssues(environment: NodeJS.ProcessEnv) {
  const result = voiceEnvironmentSchema.safeParse(environment);
  return result.success ? [] : [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
}

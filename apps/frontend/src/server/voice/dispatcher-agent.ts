import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/server/config";
import { DISPATCHER_MODEL, DISPATCHER_PROMPT, DISPATCHER_PROMPT_VERSION, DISPATCHER_TTS_MODEL, DISPATCHER_VOICE_ID } from "./dispatcher-config";

export const dispatcherAgentSchema = z.object({
  agent_id: z.string().regex(/^agent_[a-zA-Z0-9]+$/),
  version_id: z.string().min(1),
  name: z.string(),
  tags: z.array(z.string()),
  conversation_config: z.object({
    agent: z.object({ prompt: z.object({ prompt: z.string(), llm: z.string(), tool_ids: z.array(z.string()) }) }),
    tts: z.object({ voice_id: z.string(), model_id: z.string() }),
    conversation: z.object({ max_duration_seconds: z.number() }),
  }),
  platform_settings: z.object({
    auth: z.object({ enable_auth: z.boolean(), allowlist: z.array(z.unknown()) }),
    privacy: z.object({ record_voice: z.boolean(), retention_days: z.number(), delete_transcript_and_pii: z.boolean(), delete_audio: z.boolean(), zero_retention_mode: z.boolean() }),
    call_limits: z.object({ agent_concurrency_limit: z.number(), daily_limit: z.number(), bursting_enabled: z.boolean() }),
  }),
});

/** A matching name alone must never cause us to adopt or overwrite someone else's agent. */
export function verifyPreparedDispatcher(agent: z.infer<typeof dispatcherAgentSchema>) {
  const { auth, privacy, call_limits: limits } = agent.platform_settings;
  const { agent: { prompt }, tts, conversation } = agent.conversation_config;
  if (agent.name !== DISPATCHER_PROMPT_VERSION || !agent.tags.includes("mradar")
    || prompt.prompt !== DISPATCHER_PROMPT || prompt.llm !== DISPATCHER_MODEL || prompt.tool_ids.length !== 0
    || tts.voice_id !== DISPATCHER_VOICE_ID || tts.model_id !== DISPATCHER_TTS_MODEL
    || !auth.enable_auth || auth.allowlist.length !== 0 || conversation.max_duration_seconds !== 300
    || privacy.record_voice || privacy.retention_days !== 1 || !privacy.delete_transcript_and_pii || !privacy.delete_audio
    || privacy.zero_retention_mode || limits.agent_concurrency_limit !== 15 || limits.daily_limit !== 100 || limits.bursting_enabled) {
    throw new ConfigurationError("Agent settings differ from the prepared private dispatcher. Review them before adopting a version; no existing agent has been changed.");
  }
}

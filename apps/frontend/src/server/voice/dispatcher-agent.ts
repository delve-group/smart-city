import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/server/config";
import { DISPATCHER_CLIENT_EVENTS, DISPATCHER_END_CALL, DISPATCHER_FIRST_MESSAGE, DISPATCHER_LANGUAGE, DISPATCHER_MODEL, DISPATCHER_PROMPT, DISPATCHER_PROMPT_VERSION, DISPATCHER_TTS_MODEL, DISPATCHER_VOICE_ID } from "./dispatcher-config";

const endCallSchema = z.object({ type: z.literal("system"), name: z.literal("end_call"), description: z.string(), params: z.object({ system_tool_type: z.literal("end_call") }) });

export const dispatcherAgentSchema = z.object({
  agent_id: z.string().regex(/^agent_[a-zA-Z0-9]+$/),
  version_id: z.string().min(1),
  name: z.string(),
  tags: z.array(z.string()),
  conversation_config: z.object({
    agent: z.object({ language: z.string(), first_message: z.string(), prompt: z.object({ prompt: z.string(), llm: z.string(), tool_ids: z.array(z.string()), built_in_tools: z.record(z.string(), z.unknown()).nullish().transform((value) => value ?? {}) }) }),
    tts: z.object({ voice_id: z.string(), model_id: z.string() }),
    conversation: z.object({ max_duration_seconds: z.number(), client_events: z.array(z.string()) }),
  }),
  platform_settings: z.object({
    auth: z.object({ enable_auth: z.boolean(), allowlist: z.array(z.unknown()) }),
    privacy: z.object({ record_voice: z.boolean(), retention_days: z.number(), delete_transcript_and_pii: z.boolean(), delete_audio: z.boolean(), zero_retention_mode: z.boolean() }),
    call_limits: z.object({ agent_concurrency_limit: z.number(), daily_limit: z.number(), bursting_enabled: z.boolean() }),
  }),
});

/** A matching name alone must never cause us to adopt or overwrite someone else's agent. */
export function verifyPreparedDispatcher(agent: z.infer<typeof dispatcherAgentSchema>, expectedToolIds: readonly string[] = []) {
  const { auth, privacy, call_limits: limits } = agent.platform_settings;
  const { agent: { prompt, language, first_message }, tts, conversation } = agent.conversation_config;
  const endCall = endCallSchema.safeParse(prompt.built_in_tools.end_call);
  if (agent.name !== DISPATCHER_PROMPT_VERSION || !agent.tags.includes("mradar")
    || prompt.prompt !== DISPATCHER_PROMPT || prompt.llm !== DISPATCHER_MODEL
    || language !== DISPATCHER_LANGUAGE || first_message !== DISPATCHER_FIRST_MESSAGE
    || JSON.stringify([...prompt.tool_ids].sort()) !== JSON.stringify([...expectedToolIds].sort())
    || !endCall.success || endCall.data.description !== DISPATCHER_END_CALL.description
    || Object.entries(prompt.built_in_tools).some(([name, tool]) => name !== "end_call" && tool != null)
    || JSON.stringify([...conversation.client_events].sort()) !== JSON.stringify([...DISPATCHER_CLIENT_EVENTS].sort())
    || tts.voice_id !== DISPATCHER_VOICE_ID || tts.model_id !== DISPATCHER_TTS_MODEL
    || !auth.enable_auth || auth.allowlist.length !== 0 || conversation.max_duration_seconds !== 300
    || privacy.record_voice || privacy.retention_days !== 1 || !privacy.delete_transcript_and_pii || !privacy.delete_audio
    || privacy.zero_retention_mode || limits.agent_concurrency_limit !== 15 || limits.daily_limit !== 100 || limits.bursting_enabled) {
    throw new ConfigurationError("Agent settings differ from the prepared private dispatcher. Review them before adopting a version; no existing agent has been changed.");
  }
}

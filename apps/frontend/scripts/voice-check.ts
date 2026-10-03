import { z } from "zod";
import { requestProvider, VoiceProviderError } from "../src/server/voice/provider";
import { getVoiceConfig } from "../src/server/voice/config";
import { DISPATCHER_PROMPT_VERSION } from "../src/server/voice/dispatcher-config";
import { ConfigurationError } from "../src/server/config";
import { dispatcherAgentSchema, verifyPreparedDispatcher } from "../src/server/voice/dispatcher-agent";
import { verifyDispatcherTools } from "../src/server/voice/dispatcher-tools";

/** Read-only access/configuration check. Run with the ignored root environment supplied. */
async function main() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new ConfigurationError("Set ELEVENLABS_API_KEY in the ignored root .env.");
  const list = await requestProvider(`/v1/convai/agents?search=${DISPATCHER_PROMPT_VERSION}&page_size=30`, key,
    z.object({ agents: z.array(z.object({ agent_id: z.string(), name: z.string() })) }));
  console.info("ElevenLabs Agents read access available.", { matching_agents: list.agents.filter((agent) => agent.name === DISPATCHER_PROMPT_VERSION).length });
  const config = getVoiceConfig();
  const query = new URLSearchParams({ version_id: config.versionId });
  const agent = await requestProvider(`/v1/convai/agents/${encodeURIComponent(config.agentId)}?${query}`, config.apiKey, dispatcherAgentSchema);
  const tools = agent.conversation_config.agent.prompt.tool_ids;
  verifyPreparedDispatcher(agent, tools);
  if (tools.length) await verifyDispatcherTools(config.apiKey, tools);
  console.info("Dispatcher mode verified.", { mode: tools.length ? "integrated client tools" : "tool-free preparation" });
  if (agent.version_id !== config.versionId) throw new ConfigurationError("The provider did not return the configured immutable version.");
  console.info("Configured agent settings read.", { private_agent: agent.platform_settings.auth.enable_auth, duration_seconds: agent.conversation_config.conversation.max_duration_seconds, retention: agent.platform_settings.privacy });
  console.info("This check does not start a conversation or verify microphone/session cleanup.");
}
void main().catch((failure: unknown) => {
  console.error(failure instanceof ConfigurationError || failure instanceof VoiceProviderError ? failure.message : "Voice configuration check failed; provider details are withheld.");
  process.exitCode = 1;
});

import { chmod, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigurationError } from "../src/server/config";
import { getVoiceConfig } from "../src/server/voice/config";
import { dispatcherAgentSchema, verifyPreparedDispatcher } from "../src/server/voice/dispatcher-agent";
import { dispatcherConfiguration, DISPATCHER_CLIENT_EVENTS, DISPATCHER_END_CALL, DISPATCHER_FIRST_MESSAGE, DISPATCHER_LANGUAGE, DISPATCHER_MODEL, DISPATCHER_PROMPT, DISPATCHER_PROMPT_VERSION } from "../src/server/voice/dispatcher-config";
import { DISPATCHER_TOOLS, providerToolSchema, verifyDispatcherTool, verifyDispatcherTools } from "../src/server/voice/dispatcher-tools";
import { requestProvider, VoiceProviderError } from "../src/server/voice/provider";

/** Explicit integration setup; recovery reuses exact tools and never changes unrelated agents. */
async function main() {
  const config = getVoiceConfig();
  const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
  await readFile(envPath, "utf8");
  const path = `/v1/convai/agents/${encodeURIComponent(config.agentId)}`;
  console.info("Reviewing the configured private dispatcher.");
  const agent = await requestProvider(path, config.apiKey, dispatcherAgentSchema);
  const currentIds = agent.conversation_config.agent.prompt.tool_ids;
  let configurationUpgrade = false;
  try { verifyPreparedDispatcher(agent, currentIds); }
  catch (failure) {
    // Explicitly upgrade only a pinned, exact reviewed predecessor, never an unrelated agent.
    const previous = agent.conversation_config.agent;
    const hash = createHash("sha256").update(previous.prompt.prompt).digest("hex");
    const reviewedEnglish = process.argv.includes("--update-language")
      && agent.name === "mradar-dispatcher-v1" && previous.language === "en"
      && previous.first_message === "Hello, I’m mRadar’s demo reporting assistant. What happened, and where in Kraków?"
      && hash === "e9c2764c1aee617b3edc174c9afcfd849ecccee38ca1d6c9fa45a4ff49e2a451";
    const reviewedPolish = process.argv.includes("--update-prompt")
      && agent.name === "mradar-dispatcher-v2" && previous.language === DISPATCHER_LANGUAGE
      && previous.first_message === DISPATCHER_FIRST_MESSAGE
      && hash === "e6aee0a91884d93ab177360f887dc33b0d9ea690b292382196fb509568862454";
    const reviewedModel = process.argv.includes("--update-model")
      && agent.name === "mradar-dispatcher-v3" && hash === "cb691a6aabdb480a31d89fa799dc3a31c2854a8842b206b537f26f25f57e3513"
      && previous.language === DISPATCHER_LANGUAGE && previous.first_message === DISPATCHER_FIRST_MESSAGE;
    const reviewedEndCall = process.argv.includes("--update-end-call")
      && agent.name === "mradar-dispatcher-v3" && hash === "cb691a6aabdb480a31d89fa799dc3a31c2854a8842b206b537f26f25f57e3513"
      && previous.language === DISPATCHER_LANGUAGE && previous.first_message === DISPATCHER_FIRST_MESSAGE
      && previous.prompt.llm === DISPATCHER_MODEL;
    const legacyEvents = DISPATCHER_CLIENT_EVENTS.filter((event) => event !== "agent_tool_response");
    if (agent.version_id !== config.versionId
      || !(reviewedEndCall || previous.prompt.llm === "gpt-4.1-mini" && (reviewedEnglish || reviewedPolish || reviewedModel))
      || Object.values(previous.prompt.built_in_tools).some((tool) => tool != null)
      || JSON.stringify([...agent.conversation_config.conversation.client_events].sort()) !== JSON.stringify(legacyEvents.sort())) throw failure;
    verifyPreparedDispatcher({ ...agent, name: DISPATCHER_PROMPT_VERSION,
      conversation_config: { ...agent.conversation_config,
        conversation: { ...agent.conversation_config.conversation, client_events: DISPATCHER_CLIENT_EVENTS }, agent: { ...previous,
        language: DISPATCHER_LANGUAGE, first_message: DISPATCHER_FIRST_MESSAGE,
        prompt: { ...previous.prompt, prompt: DISPATCHER_PROMPT, llm: DISPATCHER_MODEL, built_in_tools: { end_call: DISPATCHER_END_CALL } } } } }, currentIds);
    configurationUpgrade = true;
  }
  if (currentIds.length) await verifyDispatcherTools(config.apiKey, currentIds);
  // If a prior update lost its response, exact definitions/readback can recover the resulting version.
  if (agent.version_id !== config.versionId && !currentIds.length) throw new ConfigurationError("The prepared agent changed since the local version pin. Review it before integrating tools.");
  const ids: string[] = [];
  for (const definition of DISPATCHER_TOOLS) {
    console.info("Preparing reviewed client tool:", definition.name);
    const query = new URLSearchParams({ search: definition.name, page_size: "100" });
    const list = await requestProvider(`/v1/convai/tools?${query}`, config.apiKey, z.object({ tools: z.array(providerToolSchema), has_more: z.boolean() }));
    const matching = list.tools.filter((tool) => tool.tool_config.name === definition.name);
    if (list.has_more || matching.length > 1) throw new ConfigurationError(`Ambiguous dispatcher tool ${definition.name}; review existing tools before retrying.`);
    const tool = matching[0] ?? await requestProvider("/v1/convai/tools", config.apiKey, providerToolSchema, { method: "POST", body: { tool_config: definition } });
    verifyDispatcherTool(tool, definition);
    ids.push(tool.id);
  }
  if (currentIds.length && JSON.stringify([...currentIds].sort()) !== JSON.stringify([...ids].sort())) throw new ConfigurationError("Existing dispatcher tool IDs differ. No agent update performed.");
  if (!currentIds.length || configurationUpgrade) await requestProvider(path, config.apiKey, dispatcherAgentSchema, {
    method: "PATCH",
    body: dispatcherConfiguration(ids),
  });
  const integrated = await requestProvider(path, config.apiKey, dispatcherAgentSchema);
  verifyPreparedDispatcher(integrated, ids);
  await verifyDispatcherTools(config.apiKey, ids);
  let localEnv = await readFile(envPath, "utf8");
  const assignment = /^(?:export\s+)?ELEVENLABS_AGENT_VERSION_ID=.*$/gm;
  localEnv = assignment.test(localEnv) ? localEnv.replace(assignment, `ELEVENLABS_AGENT_VERSION_ID=${integrated.version_id}`) : `${localEnv.trimEnd()}\nELEVENLABS_AGENT_VERSION_ID=${integrated.version_id}\n`;
  await writeFile(envPath, localEnv, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.info("Five reviewed client tools and system end_call verified; integrated private agent version saved in ignored .env.");
  console.info("No conversation started. Browser/microphone acceptance remains required.");
}
void main().catch((failure: unknown) => {
  console.error(failure instanceof ConfigurationError || failure instanceof VoiceProviderError ? failure.message : "Dispatcher tool setup failed; provider details withheld.");
  if (failure instanceof VoiceProviderError) console.error("Provider failure:", failure.code, failure.status ?? "no HTTP status");
  process.exitCode = 1;
});

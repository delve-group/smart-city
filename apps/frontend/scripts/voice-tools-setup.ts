import { chmod, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigurationError } from "../src/server/config";
import { getVoiceConfig } from "../src/server/voice/config";
import { dispatcherAgentSchema, verifyPreparedDispatcher } from "../src/server/voice/dispatcher-agent";
import { dispatcherConfiguration } from "../src/server/voice/dispatcher-config";
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
  verifyPreparedDispatcher(agent, currentIds);
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
  if (!currentIds.length) await requestProvider(path, config.apiKey, dispatcherAgentSchema, { method: "PATCH", body: dispatcherConfiguration(ids) });
  const integrated = await requestProvider(path, config.apiKey, dispatcherAgentSchema);
  verifyPreparedDispatcher(integrated, ids);
  await verifyDispatcherTools(config.apiKey, ids);
  let localEnv = await readFile(envPath, "utf8");
  const assignment = /^(?:export\s+)?ELEVENLABS_AGENT_VERSION_ID=.*$/gm;
  localEnv = assignment.test(localEnv) ? localEnv.replace(assignment, `ELEVENLABS_AGENT_VERSION_ID=${integrated.version_id}`) : `${localEnv.trimEnd()}\nELEVENLABS_AGENT_VERSION_ID=${integrated.version_id}\n`;
  await writeFile(envPath, localEnv, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.info("Five reviewed client tools attached; integrated private agent version verified and saved in ignored .env.");
  console.info("No conversation started. Browser/microphone acceptance remains required.");
}
void main().catch((failure: unknown) => {
  console.error(failure instanceof ConfigurationError || failure instanceof VoiceProviderError ? failure.message : "Dispatcher tool setup failed; provider details withheld.");
  if (failure instanceof VoiceProviderError) console.error("Provider failure:", failure.code, failure.status ?? "no HTTP status");
  process.exitCode = 1;
});

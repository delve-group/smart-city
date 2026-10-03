import { chmod, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigurationError } from "../src/server/config";
import { dispatcherAgentSchema, verifyPreparedDispatcher } from "../src/server/voice/dispatcher-agent";
import { dispatcherConfiguration, DISPATCHER_PROMPT_VERSION } from "../src/server/voice/dispatcher-config";
import { requestProvider, VoiceProviderError } from "../src/server/voice/provider";

/** Explicit setup command: creates only the private, tool-free agent, never a conversation. */
async function main() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new ConfigurationError("Set ELEVENLABS_API_KEY in the ignored root .env.");
  const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
  await readFile(envPath, "utf8"); // Require the user's local file before making provider changes.
  const list = await requestProvider(`/v1/convai/agents?search=${DISPATCHER_PROMPT_VERSION}&page_size=100`, key,
    z.object({ agents: z.array(z.object({ agent_id: z.string(), name: z.string() })), has_more: z.boolean() }));
  const matching = list.agents.filter((agent) => agent.name === DISPATCHER_PROMPT_VERSION);
  if (list.has_more || matching.length > 1) throw new ConfigurationError("Agent lookup is ambiguous. Review existing dispatchers before running setup again.");
  const configuredId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (configuredId && !matching.some((agent) => agent.agent_id === configuredId)) {
    throw new ConfigurationError("The configured agent does not match this setup. Review local configuration; no agent has been changed.");
  }
  const agentId = matching[0]?.agent_id ?? (await requestProvider("/v1/convai/agents/create", key,
    z.object({ agent_id: z.string().regex(/^agent_[a-zA-Z0-9]+$/) }), { method: "POST", body: dispatcherConfiguration([]) })).agent_id;
  const agent = await requestProvider(`/v1/convai/agents/${encodeURIComponent(agentId)}`, key, dispatcherAgentSchema);
  verifyPreparedDispatcher(agent);
  const pinnedVersion = process.env.ELEVENLABS_AGENT_VERSION_ID?.trim();
  if (pinnedVersion && pinnedVersion !== agent.version_id) {
    throw new ConfigurationError("The existing pinned version differs from the current agent. Review the version explicitly; setup has not replaced the pin.");
  }
  let localEnv = await readFile(envPath, "utf8");
  for (const [name, value] of Object.entries({ ELEVENLABS_AGENT_ID: agent.agent_id, ELEVENLABS_AGENT_VERSION_ID: agent.version_id })) {
    const assignment = new RegExp(`^(?:export\\s+)?${name}=.*$`, "gm");
    localEnv = assignment.test(localEnv) ? localEnv.replace(assignment, `${name}=${value}`) : `${localEnv.trimEnd()}\n${name}=${value}\n`;
  }
  await writeFile(envPath, localEnv, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.info("Private dispatcher prepared; agent and immutable version IDs saved in ignored root .env.");
  console.info("No client tools, browser credential or conversation started. Final integration must attach authenticated adapters and repin the reviewed version.");
}
void main().catch((failure: unknown) => {
  console.error(failure instanceof ConfigurationError || failure instanceof VoiceProviderError ? failure.message : "Dispatcher setup failed; provider details are withheld.");
  if (failure instanceof VoiceProviderError && failure.status) console.error("Provider HTTP status:", failure.status);
  process.exitCode = 1;
});

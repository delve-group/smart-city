import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/server/config";
import { requestProvider } from "./provider";

const text = (description: string, values?: string[]) => ({ type: "string", description, ...(values ? { enum: values } : {}) });
const integer = (description: string) => ({ type: "integer", description });
const object = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required });
const fields = object({
  category_id: text("An ID from the actual category catalogue supplied by the browser."),
  issue_type: text("An ID from the actual issue-type catalogue, valid for the selected category."),
  title: text("A concise English observation summary, 3–80 characters."),
  description: text("The resident's original observation, at most 1000 characters; private."),
  severity: text("Optional resident impression, not an official assessment.", ["low", "medium", "high"]),
  scope: text("What the resident actually knows is affected; retain unknown until clarified.", ["unit", "building", "street", "unknown"]),
  observed_at: text("The resident's actual observation time as an ISO UTC timestamp. Omit if unknown; never use submission time."),
  observed_time_state: text("known only when the resident supplied the observation time, otherwise unknown.", ["known", "unknown"]),
  urgent: { type: "boolean", description: "Whether the resident reported immediate danger; reporting does not dispatch emergency responders." },
}, []);

function client(name: string, description: string, parameters: ReturnType<typeof object>) {
  return { type: "client" as const, name, description: `mradar-dispatcher-tools-v1: ${description}`, parameters,
    expects_response: true, execution_mode: "immediate", response_timeout_secs: 20 };
}

/** Provider definitions contain no URLs, credentials or authority supplied by the model. */
export const PREVIOUS_DISPATCHER_TOOLS = [
  client("resolve_location", "Find actual address candidates in Kraków. If ambiguous ask the resident to select; never invent coordinates.", object({ address: text("The resident's address, 3–200 characters; preserve Polish names.") }, ["address"])),
  client("find_incidents", "Search public incidents for related context. Unavailable/stale retrieval is not evidence that no issue exists.", object({ query: text("Search text based on the observation/location, at most 1000 characters.") }, ["query"])),
  client("prepare_report", "Update the existing owned draft. Wait for the returned revision/summary, then read it back. Every change withdraws earlier confirmation.", object({
    expected_revision: integer("The current draft revision returned by the browser or last successful draft tool. Do not guess."), fields,
    candidate_id: text("Optional exact candidate ID from the latest successful resolve_location result, chosen by the resident."),
    unit: text("Optional private apartment/unit, at most 40 characters. Omit to leave unchanged; an empty value clears it."),
  }, ["expected_revision", "fields"])),
  client("confirm_report_draft", "Confirm only after the resident explicitly agrees to the exact latest readback. A correction requires preparation and fresh agreement.", object({ revision: integer("Exact revision whose returned summary and location were read back."), explicit_agreement: { type: "boolean", description: "Must be true only after the resident explicitly agrees to this revision." } }, ["revision", "explicit_agreement"])),
  client("submit_report", "Submit only the confirmed current revision. Announce only the persisted reference returned by this tool. Unknown outcomes require owned-draft reconciliation.", object({ revision: integer("The revision returned by successful confirmation; do not guess or substitute a new revision.") }, ["revision"])),
];

function currentClient(name: string, description: string, parameters: ReturnType<typeof object>) {
  return { ...client(name, description, parameters), description: `mradar-dispatcher-tools-v2: ${description}` };
}

export const DISPATCHER_TOOLS = [
  currentClient("resolve_location", "Find actual address candidates in Kraków. If ambiguous ask the resident to select; never invent coordinates.", object({ address: text("The resident's address, 3–200 characters; preserve Polish names.") }, ["address"])),
  currentClient("find_incidents", "Search public incidents for related context. Unavailable/stale retrieval is not evidence that no issue exists.", object({ query: text("Search text based on the observation/location, at most 1000 characters.") }, ["query"])),
  currentClient("prepare_report", "Update the existing owned draft. Wait for the returned revision/summary and verify it internally against the resident's facts. Do not read the full ticket aloud. Every change invalidates the confirmed revision.", object({
    expected_revision: integer("The current draft revision returned by the browser or last successful draft tool. Do not guess."), fields,
    candidate_id: text("Optional exact candidate ID from the latest successful resolve_location result, matching the resident's unambiguous address or explicitly selected by them when ambiguous."),
    unit: text("Optional private apartment/unit, at most 40 characters. Omit to leave unchanged; an empty value clears it."),
  }, ["expected_revision", "fields"])),
  currentClient("confirm_report_draft", "Confirm the exact latest prepared revision only with explicit intent to report/save these facts. A prior explicit reporting request covers faithful clarification and resident corrections unless withdrawn. Without that intent, ask one short save question; no full readback.", object({ revision: integer("Exact latest prepared revision whose returned summary and location match the facts the resident asked to report."), explicit_agreement: { type: "boolean", description: "True only when the resident explicitly requested reporting/saving the facts faithfully represented by this revision; never infer agreement from description alone." } }, ["revision", "explicit_agreement"])),
  currentClient("submit_report", "Submit only the confirmed current revision. Announce only the persisted reference returned by this tool. Unknown outcomes require owned-draft reconciliation.", object({ revision: integer("The revision returned by successful confirmation; do not guess or substitute a new revision.") }, ["revision"])),
];

export const providerToolSchema = z.object({ id: z.string().min(1), tool_config: z.record(z.string(), z.unknown()), response_mocks: z.array(z.unknown()).nullish().transform((value) => value ?? []) });
type ProviderTool = z.infer<typeof providerToolSchema>;

/** Provider adds harmless defaults. Requested semantics, field sets and absence of mocks must match. */
function matchesDefinition(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(actual) && JSON.stringify(expected) === JSON.stringify(actual);
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
    const wanted = expected as Record<string, unknown>, received = actual as Record<string, unknown>;
    return Object.entries(wanted).every(([key, value]) => key === "properties"
      ? received.properties && typeof received.properties === "object"
        && JSON.stringify(Object.keys(value as object).sort()) === JSON.stringify(Object.keys(received.properties).sort())
        && matchesDefinition(value, received.properties)
      : matchesDefinition(value, received[key]));
  }
  return expected === actual;
}

export function verifyDispatcherTool(tool: ProviderTool, expected: typeof DISPATCHER_TOOLS[number]) {
  if (tool.response_mocks.length || !matchesDefinition(expected, tool.tool_config)) {
    throw new ConfigurationError(`Dispatcher tool ${expected.name} differs from its reviewed client definition. No existing tool was changed.`);
  }
}

export async function verifyDispatcherTools(apiKey: string, ids: string[], definitions = DISPATCHER_TOOLS) {
  if (ids.length !== DISPATCHER_TOOLS.length || new Set(ids).size !== ids.length) throw new ConfigurationError("The dispatcher must have exactly five distinct reviewed client tools.");
  const seen = new Set<string>();
  for (const id of ids) {
    const tool = await requestProvider(`/v1/convai/tools/${encodeURIComponent(id)}`, apiKey, providerToolSchema);
    const expected = definitions.find((value) => value.name === tool.tool_config.name);
    if (!expected || seen.has(expected.name)) throw new ConfigurationError("The dispatcher has an unexpected or duplicated client tool.");
    verifyDispatcherTool(tool, expected);
    seen.add(expected.name);
  }
}

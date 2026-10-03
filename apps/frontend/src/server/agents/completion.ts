import "server-only";
import { z } from "zod";
import { ConfigurationError } from "../config";
import { AssessmentError } from "./errors";

const TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_CONTENT_BYTES = 8 * 1024;
const MAX_COMPLETION_TOKENS = 2_048;

const configSchema = z.object({
  SCW_PROJECT_ID: z.uuid(),
  SCW_GENERATIVE_API_KEY: z.string().min(1).max(512).regex(/^\S+$/),
  SCW_DECISION_MODEL: z.enum(["qwen3.6-35b-a3b", "mistral-small-3.2-24b-instruct-2506"]),
});

function getProviderConfig() {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(`Missing or invalid decision-provider environment variables: ${fields.join(", ")}.`);
  }
  return result.data;
}

const tokenCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const completionSchema = z.object({
  id: z.string().min(1).max(200),
  object: z.literal("chat.completion"),
  model: z.string().min(1).max(200),
  choices: z.array(z.object({
    index: z.literal(0),
    finish_reason: z.literal("stop"),
    message: z.object({
      role: z.literal("assistant"),
      content: z.string().min(1),
      tool_calls: z.array(z.unknown()).max(0).nullish(),
      function_call: z.null().optional(),
      refusal: z.union([z.null(), z.literal("")]).optional(),
    }),
  })).length(1),
  usage: z.object({
    prompt_tokens: tokenCount,
    completion_tokens: tokenCount,
    total_tokens: tokenCount,
    completion_tokens_details: z.object({ reasoning_tokens: tokenCount.optional() }).nullish(),
  }).optional(),
});

async function readBody(response: Response, signal: AbortSignal): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new AssessmentError("invalid_assessment_output", "The provider returned an empty response.", false);
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        cancel();
        throw new AssessmentError("invalid_assessment_output", "The provider response exceeds its byte limit.", false);
      }
      chunks.push(chunk.value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AssessmentError("invalid_assessment_output", "The provider returned malformed JSON.", false);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/** Shared bounded transport for incident assessment and report classification; no domain writes. */
export async function requestStructuredCompletion(request: {
  name: string; system_prompt: string; snapshot: string; schema: Record<string, unknown>;
}, options: { signal?: AbortSignal } = {}) {
  const config = getProviderConfig();
  const snapshot = request.snapshot;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const started = performance.now();
  try {
    signal.throwIfAborted();
    const response = await fetch(`https://api.scaleway.ai/${config.SCW_PROJECT_ID}/v1/chat/completions`, {
      method: "POST",
      redirect: "error",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.SCW_GENERATIVE_API_KEY}` },
      body: JSON.stringify({
        model: config.SCW_DECISION_MODEL,
        stream: false,
        n: 1,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        ...(config.SCW_DECISION_MODEL === "qwen3.6-35b-a3b" ? { reasoning_effort: "none" } : {}),
        messages: [
          { role: "system", content: request.system_prompt },
          { role: "user", content: snapshot },
        ],
        response_format: { type: "json_schema", json_schema: {
          name: request.name, schema: request.schema,
        } },
      }),
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new AssessmentError(retryable ? "provider_unavailable" : "provider_rejected",
        retryable ? "The assessment provider is temporarily unavailable." : "The assessment provider rejected the request. Check server configuration.", retryable);
    }
    const completion = completionSchema.safeParse(await readBody(response, signal));
    if (!completion.success) {
      throw new AssessmentError("invalid_assessment_output", "The provider returned an incomplete, refused or unsupported response.", false);
    }
    const content = completion.data.choices[0].message.content;
    if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
      throw new AssessmentError("invalid_assessment_output", "The assessment exceeds its byte limit.", false);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch {
      throw new AssessmentError("invalid_assessment_output", "The assessment is not valid JSON.", false);
    }
    const usage = completion.data.usage;
    return {
      value: parsed,
      provider: "scaleway",
      response_id: completion.data.id,
      requested_model: config.SCW_DECISION_MODEL,
      returned_model: completion.data.model,
      usage: usage ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens, reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? null } : null,
      duration_ms: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (options.signal?.aborted) throw new AssessmentError("assessment_cancelled", "The assessment was cancelled.", false);
    if (timeout.aborted) throw new AssessmentError("provider_timeout", "The assessment provider exceeded its time limit.", true);
    if (error instanceof AssessmentError) throw error;
    throw new AssessmentError("provider_unavailable", "The assessment provider is temporarily unavailable.", true);
  }
}

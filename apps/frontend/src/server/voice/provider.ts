import "server-only";
import { z } from "zod";

const PROVIDER_ORIGIN = "https://api.elevenlabs.io";
export class VoiceProviderError extends Error {
  constructor(readonly code: "provider_permissions" | "provider_unavailable" | "provider_rejected" | "invalid_provider_response", readonly status?: number) {
    super(code === "provider_permissions" ? "ElevenLabs access is unavailable. Check Agents permissions for the server key."
      : code === "provider_rejected" ? "ElevenLabs rejected the dispatcher configuration. Review the documented settings."
      : "The voice provider is unavailable. Continue with the form.");
  }
}

/** Server-only provider boundary. Raw headers, tokens and error bodies are never logged. */
export async function requestProvider<T>(path: string, apiKey: string, schema: z.ZodType<T>, options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const url = new URL(path, PROVIDER_ORIGIN);
  if (url.origin !== PROVIDER_ORIGIN || !url.pathname.startsWith("/v1/convai/")) throw new VoiceProviderError("provider_unavailable");
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET", cache: "no-store", redirect: "error",
      headers: { "xi-api-key": apiKey, ...(options.body ? { "Content-Type": "application/json" } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    });
  } catch { throw new VoiceProviderError("provider_unavailable"); }
  if (!response.ok) throw new VoiceProviderError([401, 403].includes(response.status) ? "provider_permissions"
    : [400, 422].includes(response.status) ? "provider_rejected" : "provider_unavailable", response.status);
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new VoiceProviderError("invalid_provider_response");
  return result.data;
}

/** Called only after the owned session service reserves the resident's bounded lease. */
export function getConversationCredential(config: { apiKey: string; agentId: string; versionId: string }, signal?: AbortSignal) {
  const query = new URLSearchParams({ agent_id: config.agentId, version_id: config.versionId });
  return requestProvider(`/v1/convai/conversation/token?${query}`, config.apiKey,
    z.object({ token: z.string().min(1), conversation_id: z.string().min(1) }), { signal });
}

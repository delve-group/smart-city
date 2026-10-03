import "server-only";

import { randomUUID } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ConfigurationError, getConfig } from "@/server/config";
import { ApiError } from "@/server/http/api";
import { authenticateMcp } from "./auth";
import { getMcpConfig, McpConfigurationError } from "./config";
import { createMcpServer } from "./tools";

const MAX_BODY_BYTES = 16 * 1024;
const BODY_TIMEOUT_MS = 5_000;

function requireResource(request: Request): void {
  const origin = getConfig().appOrigin;
  const url = new URL(request.url);
  // Forwarded headers never establish authority. The proxy must preserve the canonical Host.
  if (request.headers.get("host")?.toLowerCase() !== new URL(origin).host
    || url.pathname !== "/api/mcp" || url.search) {
    throw new ApiError(403, "invalid_resource", "Use the configured MCP endpoint.");
  }
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin !== null && suppliedOrigin !== origin) {
    throw new ApiError(403, "invalid_origin", "This origin cannot access the MCP endpoint.");
  }
}

function rpcError(status: number, code: string, message: string, correlationId: string, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Correlation-Id", correlationId);
  return Response.json({
    jsonrpc: "2.0", id: null,
    error: { code: code === "invalid_json" ? -32700 : -32000, message, data: { code, correlation_id: correlationId } },
  }, { status, headers: responseHeaders });
}

/** Bound bytes and upload time before JSON parsing. No batch can fan out into domain calls. */
async function readMessage(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "invalid_request", "Send application/json.");
  }
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new ApiError(413, "request_too_large", "The MCP request exceeds 16 KiB.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_json", "Send one JSON-RPC message.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectInterrupted: (error: ApiError) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectInterrupted = reject; });
  const onAbort = () => rejectInterrupted(new ApiError(400, "request_cancelled", "The request was cancelled."));
  request.signal.addEventListener("abort", onAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  let complete = false;
  try {
    timer = setTimeout(() => rejectInterrupted(new ApiError(408, "request_timeout", "The request body timed out.")), BODY_TIMEOUT_MS);
    if (request.signal.aborted) onAbort();
    while (true) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw new ApiError(413, "request_too_large", "The MCP request exceeds 16 KiB.");
      chunks.push(value);
    }
    complete = true;
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (Array.isArray(value)) throw new ApiError(400, "invalid_request", "Send one JSON-RPC message, not a batch.");
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json", "Send one valid JSON-RPC message.");
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const correlationId = randomUUID();
  try {
    requireResource(request);
    if (request.method !== "POST") {
      return rpcError(405, "method_not_allowed", "Use POST. This MCP endpoint has no SSE subscription or persistent sessions.", correlationId, { Allow: "POST" });
    }
    const config = getMcpConfig();
    const ctx = await authenticateMcp(request, config, correlationId);
    if (request.headers.has("mcp-session-id")) {
      throw new ApiError(400, "invalid_request", "This MCP endpoint is stateless; omit MCP-Session-Id.");
    }
    const parsedBody = await readMessage(request);
    const server = createMcpServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: MAX_BODY_BYTES,
    });
    try {
      await server.connect(transport);
      const headers = new Headers(request.headers);
      headers.delete("authorization");
      headers.delete("cookie");
      // SDK handlers receive the authenticated context through closures, never a bearer secret.
      const sdkRequest = new Request(request.url, { method: "POST", headers, signal: request.signal });
      const response = await transport.handleRequest(sdkRequest, { parsedBody });
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Correlation-Id", correlationId);
      return response;
    } finally {
      // JSON mode resolves only after the tool result is ready; no live response stream is cut off.
      try {
        await server.close();
      } finally {
        await transport.close();
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return rpcError(error.status, error.code, error.message, correlationId,
        error.status === 401 ? { "WWW-Authenticate": 'Bearer realm="mradar-mcp", error="invalid_token"' } : undefined);
    }
    const configuration = error instanceof McpConfigurationError || error instanceof ConfigurationError;
    return rpcError(503, configuration ? "mcp_unavailable" : "dependency_unavailable",
      configuration ? "MCP access is not configured correctly." : "MCP could not complete the request. Try again shortly.", correlationId);
  }
}

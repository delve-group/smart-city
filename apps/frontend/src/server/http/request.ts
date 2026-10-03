import "server-only";

import { getConfig } from "@/server/config";
import { ApiError } from "./api";

/** Cookies authenticate writes only from the explicitly configured app origin. */
export function requireAppOrigin(request: Request): void {
  if (request.headers.get("origin") !== getConfig().appOrigin) {
    throw new ApiError(403, "invalid_origin", "This request must come from the application origin.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(400, "invalid_request", "Send a JSON request body.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_json", "Send a valid JSON request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new ApiError(400, "invalid_request", "The request body is too large.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json", "Send a valid JSON request body.");
  } finally {
    reader.releaseLock();
  }
}

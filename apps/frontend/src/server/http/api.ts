import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable = false,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function success<T>(data: T, correlationId: string, status = 200) {
  return NextResponse.json(
    { data, correlation_id: correlationId },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? String(error.code) : "";
  return (
    code.startsWith("08") ||
    [
      "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "EAI_AGAIN",
      "28P01", "28000", "3D000", "57P01", "57P02", "57P03", "53300", "42P01", "42703",
    ].includes(code) ||
    error.message === "Connection terminated due to connection timeout" ||
    error.message === "timeout exceeded when trying to connect"
  );
}

/** One response boundary for the persistent API; never return SQL or credentials. */
export async function handleApi(
  handler: (correlationId: string) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    return await handler(correlationId);
  } catch (error) {
    const safeError = error instanceof ApiError
      ? error
      : isDatabaseUnavailable(error)
        ? new ApiError(503, "dependency_unavailable", "The database is not ready. Try again shortly.", true)
        : new ApiError(500, "internal_error", "The request could not be completed.");

    if (!(error instanceof ApiError)) {
      // Keep diagnostic correlation without logging request bodies, SQL or credentials.
      console.error("API request failed", { correlation_id: correlationId, code: safeError.code });
    }

    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (safeError.retryAfter !== undefined) headers["Retry-After"] = String(safeError.retryAfter);
    return NextResponse.json(
      {
        code: safeError.code,
        message: safeError.message,
        retryable: safeError.retryable,
        correlation_id: correlationId,
      },
      { status: safeError.status, headers },
    );
  }
}

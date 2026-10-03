import { z } from "zod";

export class IntakeError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export async function requestIntake<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { credentials: "same-origin", ...options }); }
  catch { throw new IntakeError("network_error", "The connection was lost. Your input is still here; check the draft before retrying."); }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ code: z.string(), message: z.string() }).safeParse(body);
    throw error.success ? new IntakeError(error.data.code, error.data.message)
      : new IntakeError("unavailable", "The report service is unavailable. Your input is still here.");
  }
  const result = z.object({ data: schema, correlation_id: z.string() }).safeParse(body);
  if (!result.success) throw new IntakeError("unexpected_response", "The report service returned an unexpected response. Check the draft before retrying.");
  return result.data.data;
}

export function jsonBody(method: "POST" | "PATCH", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

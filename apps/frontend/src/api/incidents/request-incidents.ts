import { z } from "zod";

export class IncidentApiError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export async function requestIncidents<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000) });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = z.object({ code: z.string(), message: z.string() }).safeParse(body);
    throw new IncidentApiError(problem.success ? problem.data.code : "unavailable", problem.success ? problem.data.message : "Public incidents are unavailable. Try again.");
  }
  const parsed = z.object({ data: schema, correlation_id: z.string() }).safeParse(body);
  if (!parsed.success) throw new IncidentApiError("unexpected_response", "Unexpected public incident response. Last-known data is retained.");
  return parsed.data.data;
}

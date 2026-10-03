import { z } from "zod";
import { InstitutionApiError } from "./types";

const problemSchema = z.object({ code: z.string(), message: z.string() });

/** Shared fetch for the inbox: common envelope in, typed error out. */
export async function requestInstitution<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = problemSchema.safeParse(body);
    throw problem.success
      ? new InstitutionApiError(response.status, problem.data.code, problem.data.message)
      : new InstitutionApiError(response.status, "unexpected_response", `The request failed (${response.status}).`);
  }
  const parsed = z.object({ data: schema }).safeParse(body);
  if (!parsed.success) throw new InstitutionApiError(response.status, "unexpected_response", "Unexpected response from the inbox.");
  return parsed.data.data;
}

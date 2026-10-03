import { z } from "zod";
import { mapWorkspace } from "./mappers";
import { OperationsApiError, workspaceDtoSchema, type Workspace } from "./types";

const problemSchema = z.object({ code: z.string(), message: z.string() });
const envelopeSchema = z.object({ data: workspaceDtoSchema });

/** Every operations endpoint answers with the whole workspace, so one parser serves them all. */
export async function requestWorkspace(url: string, init?: RequestInit): Promise<Workspace> {
  const response = await fetch(url, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = problemSchema.safeParse(body);
    throw problem.success
      ? new OperationsApiError(response.status, problem.data.code, problem.data.message)
      : new OperationsApiError(response.status, "unexpected_response", `The request failed (${response.status}).`);
  }

  const parsed = envelopeSchema.safeParse(body);
  if (!parsed.success) throw new OperationsApiError(response.status, "unexpected_response", "Unexpected workspace response.");
  return mapWorkspace(parsed.data.data);
}

import { mapActor, readProblem, sessionEnvelopeSchema, type SessionActor } from "./types";

/** GET /api/auth/session — the signed-in actor, or null when there is no valid session. */
export async function getSession(signal?: AbortSignal): Promise<SessionActor | null> {
  const response = await fetch("/api/auth/session", { signal });
  if (response.status === 401) return null;
  if (!response.ok) throw await readProblem(response);
  const parsed = sessionEnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected session response.");
  return mapActor(parsed.data.data.actor);
}

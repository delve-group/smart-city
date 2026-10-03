import { mapActor, readProblem, sessionEnvelopeSchema, type SessionActor, type StaffRole } from "./types";

/** GET /api/auth/session — this screen's signed-in staff actor, or null when it is signed out. */
export async function getSession(role: StaffRole, signal?: AbortSignal): Promise<SessionActor | null> {
  const response = await fetch(`/api/auth/session?role=${role}`, { signal });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw await readProblem(response);
  const parsed = sessionEnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected session response.");
  return mapActor(parsed.data.data.actor);
}

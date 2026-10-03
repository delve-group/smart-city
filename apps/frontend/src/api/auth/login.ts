import { mapActor, readProblem, sessionEnvelopeSchema, type SessionActor } from "./types";

/** POST /api/auth/login — sign in with a provisioned staff account. The server decides the role. */
export async function login(username: string, password: string): Promise<SessionActor> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw await readProblem(response);
  const parsed = sessionEnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected sign-in response.");
  return mapActor(parsed.data.data.actor);
}

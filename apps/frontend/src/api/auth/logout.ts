import { readProblem } from "./types";

/** POST /api/auth/logout — revoke the current session. */
export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw await readProblem(response);
}

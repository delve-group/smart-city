import { readProblem, type StaffRole } from "./types";

/** POST /api/auth/logout — sign this screen's staff role out; other sessions stay. */
export async function logout(role: StaffRole): Promise<void> {
  const response = await fetch(`/api/auth/logout?role=${role}`, { method: "POST" });
  if (!response.ok) throw await readProblem(response);
}

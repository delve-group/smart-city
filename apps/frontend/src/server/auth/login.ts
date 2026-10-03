import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { getPool } from "@/server/db";
import { hashPassword, verifyPassword } from "./password";
import { hashSessionToken, insertSession } from "./sessions";
import type { Actor, IssuedSession } from "./types";

export const loginInputSchema = z.object({
  username: z.string().trim().min(1).max(64).toLowerCase(),
  password: z.string().min(1).max(256),
}).strict();

type LoginResult =
  | { kind: "success"; issued: IssuedSession }
  | { kind: "invalid" }
  | { kind: "limited"; retryAfter: number };

let dummyHash: Promise<string> | undefined;

/** Persist the throttle so restarting the app does not reset failed attempts. */
export async function loginStaff(
  input: z.infer<typeof loginInputSchema>,
  previousToken: string | null,
): Promise<LoginResult> {
  const key = createHash("sha256").update(input.username).digest("hex");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Serialize attempts for this username across requests and app processes.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
    await client.query(
      "DELETE FROM auth_login_attempts WHERE key_hash = $1 AND window_started_at <= now() - interval '15 minutes'",
      [key],
    );
    const attempt = await client.query<{ attempts: number; retry_after: number }>(
      `SELECT attempts, greatest(1, ceil(extract(epoch FROM window_started_at + interval '15 minutes' - now())))::int AS retry_after
       FROM auth_login_attempts WHERE key_hash = $1`,
      [key],
    );
    if (attempt.rows[0]?.attempts >= 5) {
      await client.query("COMMIT");
      return { kind: "limited", retryAfter: attempt.rows[0].retry_after };
    }

    const result = await client.query<Actor & { password_hash: string }>(
      `SELECT id, role, identity_kind, institution_id, password_hash
       FROM actors WHERE username = $1 AND identity_kind = 'demo_staff'`,
      [input.username],
    );
    const actor = result.rows[0];
    // Unknown accounts still do password work and receive the same public error.
    let passwordHash = actor?.password_hash;
    if (!passwordHash) {
      dummyHash ??= hashPassword("no-account-can-use-this-password");
      passwordHash = await dummyHash;
    }
    const passwordMatches = await verifyPassword(input.password, passwordHash);
    if (!actor || !passwordMatches) {
      await client.query(
        `INSERT INTO auth_login_attempts (key_hash, attempts, window_started_at) VALUES ($1, 1, now())
         ON CONFLICT (key_hash) DO UPDATE SET attempts = auth_login_attempts.attempts + 1`,
        [key],
      );
      await client.query("COMMIT");
      return { kind: "invalid" };
    }

    await client.query("DELETE FROM auth_login_attempts WHERE key_hash = $1", [key]);
    if (previousToken) {
      // Replace only this role's earlier session; the other staff role stays signed in.
      await client.query(
        "DELETE FROM sessions WHERE token_hash = $1 AND actor_id IN (SELECT id FROM actors WHERE role = $2)",
        [hashSessionToken(previousToken), actor.role],
      );
    }
    const issued = await insertSession(client, actor);
    await client.query("COMMIT");
    return { kind: "success", issued };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

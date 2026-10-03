import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/server/db";
import { ApiError } from "@/server/http/api";
import type { Actor, ActorRole, IssuedSession, Session } from "./types";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Explicit projection: password hashes and session tokens never enter the API DTO. */
export function projectActor(row: Actor): Actor {
  return { id: row.id, role: row.role, identity_kind: row.identity_kind, institution_id: row.institution_id };
}

export async function findSession(token: string | null): Promise<Session | null> {
  if (!token) return null;
  const result = await getPool().query<Actor & { expires_at: Date }>(
    `SELECT a.id, a.role, a.identity_kind, a.institution_id, s.expires_at
     FROM sessions s JOIN actors a ON a.id = s.actor_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];
  return row ? { actor: projectActor(row), expires_at: row.expires_at.toISOString() } : null;
}

export async function requireSession(token: string | null, role?: ActorRole): Promise<Session> {
  const session = await findSession(token);
  if (!session) throw new ApiError(401, "unauthenticated", "An active session is required.");
  if (role && session.actor.role !== role) {
    throw new ApiError(403, "forbidden", "This account cannot access this resource.");
  }
  return session;
}

export async function insertSession(client: PoolClient, actor: Actor): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const durationSeconds = 30 * 24 * 60 * 60;
  const result = await client.query<{ expires_at: Date }>(
    `INSERT INTO sessions (token_hash, actor_id, expires_at)
     VALUES ($1, $2, now() + $3 * interval '1 second') RETURNING expires_at`,
    [hashSessionToken(token), actor.id, durationSeconds],
  );
  return { token, session: { actor: projectActor(actor), expires_at: result.rows[0].expires_at.toISOString() } };
}

export async function createGuestSession(): Promise<IssuedSession> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<Actor>(
      `INSERT INTO actors (role, identity_kind) VALUES ('resident', 'guest')
       RETURNING id, role, identity_kind, institution_id`,
    );
    const issued = await insertSession(client, result.rows[0]);
    await client.query("COMMIT");
    return issued;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeSession(token: string | null): Promise<void> {
  if (token) await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

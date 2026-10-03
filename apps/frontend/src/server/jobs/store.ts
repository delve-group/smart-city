import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ClaimedWork, WorkItem, WorkKind, WorkResult, WorkSource } from "./types";

interface WorkRow {
  id: string;
  kind: WorkKind;
  source_type: WorkSource["type"];
  source_id: string;
  source_version: number;
  payload: Record<string, unknown>;
  correlation_id: string;
  attempts: number;
}

async function inTransaction<T>(client: PoolClient, operation: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

/** Only the worker's dedicated connection calls these short transactions. */
export async function claimWork(
  client: PoolClient,
  workerId: string,
  kinds: WorkKind[],
  leaseMs: number,
): Promise<ClaimedWork | null> {
  return inTransaction(client, async () => {
    const expired = await client.query<{ id: string; lease_token: string }>(
      `SELECT id, lease_token FROM work_items
       WHERE state = 'running' AND lease_expires_at <= clock_timestamp()
       FOR UPDATE SKIP LOCKED`,
    );
    for (const row of expired.rows) {
      await client.query(
        `UPDATE work_attempts SET outcome = 'abandoned', detail = 'lease_expired', finished_at = clock_timestamp()
         WHERE lease_token = $1 AND outcome = 'running'`, [row.lease_token],
      );
      await client.query(
        `UPDATE work_items SET state = 'queued', lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
           available_at = clock_timestamp(), updated_at = clock_timestamp(), detail = 'lease_expired'
         WHERE id = $1`, [row.id],
      );
    }
    await client.query(
      `UPDATE work_items SET state = 'parked', detail = 'handler_unavailable', updated_at = clock_timestamp()
       WHERE state = 'queued' AND NOT (kind = ANY($1::text[]))`, [kinds],
    );
    await client.query(
      `UPDATE work_items SET state = 'queued', detail = NULL, available_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE state = 'parked' AND detail = 'handler_unavailable' AND kind = ANY($1::text[])`, [kinds],
    );
    const selected = await client.query<WorkRow>(
      `SELECT id, kind, source_type, source_id, source_version, payload, correlation_id, attempts
       FROM work_items w
       WHERE state IN ('queued', 'parked') AND available_at <= clock_timestamp()
         AND kind = ANY($1::text[])
         AND NOT EXISTS (SELECT 1 FROM work_items busy
           WHERE busy.source_type = w.source_type AND busy.source_id = w.source_id AND busy.state = 'running')
       ORDER BY available_at, created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`, [kinds],
    );
    const row = selected.rows[0];
    if (!row) return null;
    const token = randomUUID();
    await client.query(
      `UPDATE work_items SET state = 'running', attempts = attempts + 1,
         lease_token = $2, lease_owner = $3, lease_expires_at = clock_timestamp() + $4 * interval '1 millisecond',
         updated_at = clock_timestamp(), detail = NULL
       WHERE id = $1`, [row.id, token, workerId, leaseMs],
    );
    await client.query(
      `INSERT INTO work_attempts (lease_token, work_id, attempt, worker_id) VALUES ($1, $2, $3, $4)`,
      [token, row.id, row.attempts + 1, workerId],
    );
    const work: WorkItem = {
      id: row.id, kind: row.kind,
      source: { type: row.source_type, id: row.source_id, version: row.source_version },
      payload: row.payload, attempt: row.attempts + 1, correlation_id: row.correlation_id,
    };
    return { work, lease_token: token };
  });
}

export async function renewWorkLease(client: PoolClient, claimed: ClaimedWork, leaseMs: number): Promise<boolean> {
  const result = await client.query(
    `UPDATE work_items SET lease_expires_at = clock_timestamp() + $3 * interval '1 millisecond', updated_at = clock_timestamp()
     WHERE id = $1 AND lease_token = $2 AND state = 'running' AND lease_expires_at > clock_timestamp()`,
    [claimed.work.id, claimed.lease_token, leaseMs],
  );
  return result.rowCount === 1;
}

/** False means ownership expired or another attempt owns the record. */
export async function finishWork(client: PoolClient, claimed: ClaimedWork, result: WorkResult): Promise<boolean> {
  return inTransaction(client, async () => {
    const current = await client.query<{ retries: number }>(
      `SELECT retries FROM work_items WHERE id = $1 AND lease_token = $2
       AND state = 'running' AND lease_expires_at > clock_timestamp() FOR UPDATE`,
      [claimed.work.id, claimed.lease_token],
    );
    const row = current.rows[0];
    if (!row) return false;
    const exhausted = result.status === "retry" && row.retries >= 2;
    const state = exhausted ? "failed" : result.status === "retry" ? "queued" : result.status;
    const detail = result.status === "done" ? result.detail ?? null
      : exhausted ? `retry_limit: ${result.reason}`.slice(0, 300) : result.reason;
    const delay = result.status === "parked" ? 30_000 : result.status === "retry" && !exhausted
      ? row.retries === 0 ? 2_000 : 10_000 : 0;
    await client.query(
      `UPDATE work_items SET state = $3, detail = $4,
         attempts = attempts - $5, retries = retries + $6,
         available_at = clock_timestamp() + $7 * interval '1 millisecond',
         lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
         updated_at = clock_timestamp(), finished_at = CASE WHEN $3 IN ('done', 'failed') THEN clock_timestamp() ELSE NULL END
       WHERE id = $1 AND lease_token = $2`,
      [claimed.work.id, claimed.lease_token, state, detail, result.status === "parked" ? 1 : 0,
        result.status === "retry" && !exhausted ? 1 : 0, delay],
    );
    await client.query(
      `UPDATE work_attempts SET outcome = $2, detail = $3, finished_at = clock_timestamp()
       WHERE lease_token = $1 AND outcome = 'running'`,
      [claimed.lease_token, exhausted ? "failed" : result.status, detail],
    );
    return true;
  });
}

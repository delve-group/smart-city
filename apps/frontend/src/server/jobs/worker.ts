import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import type { Pool } from "pg";
import { z } from "zod";
import { claimWork, finishWork, renewWorkLease } from "./store";
import type { ClaimedWork, WorkHandler, WorkKind, WorkResult } from "./types";

// Separate from the migration advisory lock (736142000).
const WORKER_LOCK = 736142001;
const resultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("done"), detail: z.string().max(300).optional() }).strict(),
  ...(["retry", "failed", "parked"] as const).map((status) =>
    z.object({ status: z.literal(status), reason: z.string().min(1).max(300) }).strict()),
]);

export class WorkerRuntimeError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "WorkerRuntimeError"; }
}

interface WorkerOptions {
  pollMs: number;
  leaseMs: number;
  heartbeatMs: number;
  signal: AbortSignal;
  handlers: ReadonlyMap<WorkKind, WorkHandler>;
}

/**
 * One process and one serial dispatcher. The CLI must exit on a rejected run:
 * a handler cannot be safely allowed to continue after its DB session is lost.
 */
export async function runWorker(pool: Pool, options: WorkerOptions): Promise<void> {
  const client = await pool.connect();
  const workerId = randomUUID();
  let active: ClaimedWork | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTask: Promise<void> | undefined;
  let rejectFailure: (error: Error) => void = () => undefined;
  const failure = new Promise<never>((_, reject) => { rejectFailure = reject; });
  // Attach immediately, including during initial connection/schema checks.
  void failure.catch(() => undefined);
  const connectionLost = () => rejectFailure(new WorkerRuntimeError(
    "database_connection_lost", "Worker lost its database connection; the supervisor will restart it.",
  ));
  client.on("error", connectionLost);

  try {
    const locked = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1) AS acquired", [WORKER_LOCK]);
    if (!locked.rows[0].acquired) throw new WorkerRuntimeError("worker_already_running", "Another worker already owns this database. Run only one worker.");
    // Querying the actual tables fails clearly if migration 002 is missing.
    await client.query("SELECT id, lease_token FROM work_items LIMIT 0");
    await client.query("SELECT lease_token, outcome FROM work_attempts LIMIT 0");
    const kinds = [...options.handlers.keys()];
    await client.query(
      `INSERT INTO work_worker_heartbeat (singleton, worker_id, heartbeat_at, started_at, registered_kinds)
       VALUES (true, $1, clock_timestamp(), clock_timestamp(), $2)
       ON CONFLICT (singleton) DO UPDATE SET worker_id = EXCLUDED.worker_id,
         heartbeat_at = EXCLUDED.heartbeat_at, started_at = EXCLUDED.started_at, registered_kinds = EXCLUDED.registered_kinds`,
      [workerId, kinds],
    );

    const heartbeat = async () => {
      const lease = active;
      if (lease && !await renewWorkLease(client, lease, options.leaseMs) && active === lease) {
        throw new WorkerRuntimeError("lease_lost", "Worker lease expired or changed; stopping to preserve ownership.");
      }
      const updated = await client.query(
        "UPDATE work_worker_heartbeat SET heartbeat_at = clock_timestamp() WHERE singleton AND worker_id = $1", [workerId],
      );
      if (updated.rowCount !== 1) throw new WorkerRuntimeError("worker_ownership_lost", "Worker heartbeat ownership changed; stopping.");
    };
    heartbeatTimer = setInterval(() => {
      if (heartbeatTask) return;
      heartbeatTask = heartbeat().catch((error: unknown) => {
        rejectFailure(error instanceof WorkerRuntimeError ? error : new WorkerRuntimeError(
          "heartbeat_failed", "Worker heartbeat failed. Check database availability; the supervisor will restart it.",
        ));
      }).finally(() => { heartbeatTask = undefined; });
    }, options.heartbeatMs);
    console.info("Worker ready", { registered_kinds: kinds, missing_handlers: ["triage", "index", "execute"].filter((kind) => !kinds.includes(kind as WorkKind)) });

    while (!options.signal.aborted) {
      const claimed = await Promise.race([claimWork(client, workerId, kinds, options.leaseMs), failure]);
      if (!claimed) {
        await Promise.race([sleep(options.pollMs, undefined, { signal: options.signal }).catch((error: unknown) => {
          if (!(error instanceof Error) || error.name !== "AbortError") throw error;
        }), failure]);
        continue;
      }
      active = claimed;
      const handler = options.handlers.get(claimed.work.kind)!;
      const handled = Promise.resolve().then(() => handler(claimed.work)).then((value): WorkResult => {
        const parsed = resultSchema.safeParse(value);
        return parsed.success ? parsed.data : { status: "failed", reason: "invalid_handler_result" };
      }).catch((): WorkResult => ({ status: "failed", reason: "handler_error" }));
      const result = await Promise.race([handled, failure]);
      active = undefined;
      if (!await Promise.race([finishWork(client, claimed, result), failure])) {
        throw new WorkerRuntimeError("lease_lost", "Work completion was rejected because its lease expired or changed.");
      }
      console.info("Work attempt finished", {
        work_id: claimed.work.id, kind: claimed.work.kind, attempt: claimed.work.attempt,
        handler_result: result.status, correlation_id: claimed.work.correlation_id,
      });
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await heartbeatTask;
    // Never erase the heartbeat of a replacement worker.
    await client.query("DELETE FROM work_worker_heartbeat WHERE singleton AND worker_id = $1", [workerId]).catch(() => undefined);
    client.removeListener("error", connectionLost);
    client.release(true); // Closes the dedicated session and its advisory lock.
  }
}

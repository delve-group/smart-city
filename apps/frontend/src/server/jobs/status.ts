import type { WorkKind, WorkQueryClient, WorkSource, WorkState } from "./types";

export interface SourceWorkStatus {
  processing: { state: "idle" | "queued" | "retrying" | "failed"; detail: string | null };
  work: Array<{ kind: WorkKind; state: WorkState; source_version: number; attempts: number; retries: number; detail: string | null }>;
}

/** The caller must first authorize the source; this reader does not grant access. */
export async function getSourceWorkStatus(
  client: WorkQueryClient,
  source: Pick<WorkSource, "type" | "id">,
): Promise<SourceWorkStatus> {
  const rows = await client.query<SourceWorkStatus["work"][number]>(
    `SELECT DISTINCT ON (kind) kind, state, source_version, attempts, retries, detail
     FROM work_items WHERE source_type = $1 AND source_id = $2
     ORDER BY kind, source_version DESC, created_at DESC`, [source.type, source.id],
  );
  const work = rows.rows;
  const failed = work.find((item) => item.state === "failed");
  const pending = work.find((item) => item.state !== "done");
  return {
    processing: failed ? { state: "failed", detail: failed.detail }
      : pending ? { state: work.some((item) => item.state !== "done" && item.retries > 0) ? "retrying" : "queued", detail: pending.detail }
        : { state: "idle", detail: null },
    work,
  };
}

export async function getWorkerDiagnostics(client: WorkQueryClient, maxAgeMs: number) {
  const heartbeat = await client.query<{ healthy: boolean; heartbeat_at: Date; registered_kinds: WorkKind[] }>(
    `SELECT heartbeat_at > clock_timestamp() - $1 * interval '1 millisecond' AS healthy,
       heartbeat_at, registered_kinds FROM work_worker_heartbeat WHERE singleton`, [maxAgeMs],
  );
  const counts = await client.query<{ state: WorkState; count: number }>(
    "SELECT state, count(*)::integer AS count FROM work_items GROUP BY state ORDER BY state",
  );
  return { healthy: heartbeat.rows[0]?.healthy ?? false,
    heartbeat_at: heartbeat.rows[0]?.heartbeat_at?.toISOString() ?? null,
    registered_kinds: heartbeat.rows[0]?.registered_kinds ?? [], work: counts.rows };
}

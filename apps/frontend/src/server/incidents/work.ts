import "server-only";

import type { PoolClient } from "pg";
import { enqueueWork } from "@/server/jobs";

/** Index work for the incident's new version, in the caller's transaction (workflow contracts §8). */
export async function enqueueIncidentIndex(client: PoolClient, incident: { id: string; version: number }, correlationId: string) {
  await enqueueWork(client, {
    kind: "index",
    source: { type: "incident", id: incident.id, version: incident.version },
    idempotency_key: `index:incident:${incident.id}:v${incident.version}`,
    correlation_id: correlationId,
  });
}

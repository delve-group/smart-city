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
  // Ticket projections include current incident classification/title/location. Both
  // version components only increase; HTTP ticket commands keep their own version.
  const tickets = await client.query<{ id: string; version: number }>(
    "SELECT t.id, (t.version + i.version) AS version FROM service_tickets t JOIN incidents i ON i.id = t.incident_id WHERE i.id = $1",
    [incident.id],
  );
  for (const ticket of tickets.rows) {
    await enqueueWork(client, {
      kind: "index", source: { type: "service_ticket", id: ticket.id, version: ticket.version },
      idempotency_key: `index:service_ticket:${ticket.id}:projection-v${ticket.version}`,
      correlation_id: correlationId,
    });
  }
}

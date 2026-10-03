import "server-only";

import { getPool } from "@/server/db";

/*
 * DEMO CONNECTOR for the fictional institutions. It is not an integration with a real utility.
 * Each request is stored under its execution key, so sending twice creates one external request
 * and an uncertain outcome can be resolved by lookup. Faults for rehearsals come from
 * `demo_connector_faults`.
 */

export type ConnectorResult =
  | { outcome: "created"; external_reference: string }
  | { outcome: "failed"; reason: string }
  | { outcome: "unknown" };

const PREFIX: Record<string, string> = {
  "demo-electricity": "ELE", "demo-water": "WOD", "demo-roads": "DRO", "demo-transit": "KOM",
  "demo-waste": "OCZ", "demo-greenery": "ZIE", "demo-air": "SRO",
};

async function store(executionKey: string, institutionId: string, payload: unknown): Promise<string> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO demo_connector_requests (execution_key, institution_id, external_reference, payload)
     VALUES ($1, $2, $3 || '-26-' || lpad(nextval('service_ticket_reference_seq')::text, 6, '0'), $4)
     ON CONFLICT (execution_key) DO NOTHING`,
    [executionKey, institutionId, PREFIX[institutionId] ?? "TKT", JSON.stringify(payload)],
  );
  return (await lookupConnectorRequest(executionKey))!;
}

/** The external reference recorded for this key, or null if the institution never received it. */
export async function lookupConnectorRequest(executionKey: string): Promise<string | null> {
  const result = await getPool().query<{ external_reference: string }>(
    "SELECT external_reference FROM demo_connector_requests WHERE execution_key = $1",
    [executionKey],
  );
  return result.rows[0]?.external_reference ?? null;
}

export async function sendToConnector(executionKey: string, institutionId: string, payload: unknown): Promise<ConnectorResult> {
  const fault = await getPool().query<{ mode: "fail" | "timeout_before" | "timeout_after" }>(
    `UPDATE demo_connector_faults SET remaining = remaining - 1
     WHERE id = (SELECT id FROM demo_connector_faults WHERE institution_id = $1 AND remaining > 0 ORDER BY id LIMIT 1)
     RETURNING mode`,
    [institutionId],
  );
  const mode = fault.rows[0]?.mode;
  if (mode === "fail") return { outcome: "failed", reason: "The demo institution refused the request (simulated failure)." };
  if (mode === "timeout_before") return { outcome: "unknown" };
  const reference = await store(executionKey, institutionId, payload);
  // The request arrived, but its answer was lost on the way back.
  if (mode === "timeout_after") return { outcome: "unknown" };
  return { outcome: "created", external_reference: reference };
}

import "server-only";

import type { PoolClient } from "pg";
import { enqueueWork } from "@/server/jobs";

/**
 * Pending work for a report change, written in the caller's transaction (workflow contracts §8):
 * it commits or rolls back together with the report. Payloads carry no narrative; handlers re-read.
 */
export async function enqueueReportWork(
  client: PoolClient,
  report: { id: string; version: number },
  correlationId: string,
  options: { triage: boolean },
): Promise<void> {
  const source = { type: "report" as const, id: report.id, version: report.version };
  if (options.triage) {
    await enqueueWork(client, {
      kind: "triage",
      source,
      idempotency_key: `triage:report:${report.id}:v${report.version}`,
      correlation_id: correlationId,
    });
  }
  await enqueueWork(client, {
    kind: "index",
    source,
    idempotency_key: `index:report:${report.id}:v${report.version}`,
    correlation_id: correlationId,
  });
}

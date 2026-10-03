import type { PoolClient } from "pg";
import { z } from "zod";
import { WorkInputError, type EnqueueWorkInput } from "./types";

const workSchema = z.object({
  kind: z.enum(["triage", "index", "execute"]),
  source: z.object({
    type: z.enum(["report", "incident", "service_ticket", "action_proposal"]),
    id: z.string().min(1).max(200),
    version: z.number().int().min(1).max(2_147_483_647),
  }).strict(),
  idempotency_key: z.string().min(1).max(300),
  payload: z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean(), z.null()])).default({}),
  correlation_id: z.string().min(1).max(200),
}).strict().refine((work) => (
  (work.kind === "triage" && work.source.type === "report")
  || (work.kind === "index" && work.source.type !== "action_proposal")
  || (work.kind === "execute" && work.source.type === "action_proposal")
));

/** The caller owns the open transaction and rolls it back on any thrown error. */
export async function enqueueWork(
  client: PoolClient,
  input: EnqueueWorkInput,
): Promise<{ work_id: string; created: boolean }> {
  const parsed = workSchema.safeParse(input);
  if (!parsed.success) throw new WorkInputError("invalid_request", "Invalid work identity or metadata.");
  const work = parsed.data;
  const payload = JSON.stringify(work.payload);
  if (Buffer.byteLength(payload, "utf8") > 2048) {
    throw new WorkInputError("invalid_request", "Work metadata must fit within 2 KB.");
  }
  // Match the stored JSONB bound, including its canonical spacing.
  const size = await client.query<{ allowed: boolean }>(
    "SELECT octet_length($1::jsonb::text) <= 2048 AS allowed", [payload],
  );
  if (!size.rows[0].allowed) throw new WorkInputError("invalid_request", "Work metadata must fit within 2 KB.");

  const values = [work.kind, work.source.type, work.source.id, work.source.version, work.idempotency_key, payload, work.correlation_id];
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO work_items (kind, source_type, source_id, source_version, idempotency_key, payload, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, values,
  );
  if (inserted.rows[0]) return { work_id: inserted.rows[0].id, created: true };

  const existing = await client.query<{ id: string; matches: boolean }>(
    `SELECT id, kind = $1 AND source_type = $2 AND source_id = $3
       AND source_version = $4 AND payload = $6::jsonb AS matches
     FROM work_items WHERE idempotency_key = $5`, values.slice(0, 6),
  );
  if (!existing.rows[0]?.matches) {
    throw new WorkInputError("idempotency_conflict", "This work identity already has different content.");
  }
  return { work_id: existing.rows[0].id, created: false };
}

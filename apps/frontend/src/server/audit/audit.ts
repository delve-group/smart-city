import "server-only";

import type { PoolClient } from "pg";
import type { ActorContext } from "@/server/actor-context";

export interface AuditEntry {
  operation: string;
  entity_type: "report_draft" | "report" | "incident" | "action_proposal" | "service_ticket";
  entity_id: string;
  /** IDs and versions only; no narratives, credentials or transcripts. */
  related?: Record<string, string | number | boolean | null>;
  outcome: string;
  reason?: string | null;
}

/** Writes in the caller's transaction, so an audit row never outlives a rolled-back change. */
export async function recordAudit(client: PoolClient, ctx: ActorContext, entry: AuditEntry): Promise<void> {
  await client.query(
    `INSERT INTO audit_events
       (actor_kind, actor_id, actor_role, operation, entity_type, entity_id, related, outcome, reason, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      ctx.kind === "session" ? "session" : "system",
      ctx.kind === "session" ? ctx.actor.id : null,
      ctx.kind === "session" ? ctx.actor.role : ctx.kind === "system" ? ctx.principal : "anonymous",
      entry.operation,
      entry.entity_type,
      entry.entity_id,
      JSON.stringify(entry.related ?? {}),
      entry.outcome,
      entry.reason ?? null,
      ctx.correlation_id,
    ],
  );
}

import type { Actor } from "@/server/auth/types";

export type SystemPrincipal = "triage" | "decision_maker" | "executor" | "indexer";

/**
 * Authority for a domain service. Built by the authenticated adapter (HTTP route, client-tool
 * route, MCP adapter or worker); never taken from a request body or model output.
 */
export type ActorContext = { correlation_id: string } & (
  | { kind: "session"; actor: Actor }
  | { kind: "system"; principal: SystemPrincipal }
);

export function sessionContext(actor: Actor, correlationId: string): ActorContext {
  return { kind: "session", actor, correlation_id: correlationId };
}

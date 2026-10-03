import type { Actor } from "@/server/auth/types";

export type SystemPrincipal = "triage" | "decision_maker" | "executor" | "indexer";

/**
 * Authority for a domain service. Built by the authenticated adapter (HTTP route, client-tool
 * route, MCP adapter or worker); never taken from a request body or model output.
 */
export type ActorContext = { correlation_id: string } & (
  | { kind: "session"; actor: Actor }
  | { kind: "system"; principal: SystemPrincipal }
  | { kind: "anonymous" }
);

export function sessionContext(actor: Actor, correlationId: string): ActorContext {
  return { kind: "session", actor, correlation_id: correlationId };
}

/** A public read with no session: sees public projections only. */
export function anonymousContext(correlationId: string): ActorContext {
  return { kind: "anonymous", correlation_id: correlationId };
}

export function systemContext(principal: SystemPrincipal, correlationId: string): ActorContext {
  return { kind: "system", principal, correlation_id: correlationId };
}

import type { PoolClient } from "pg";

export type WorkKind = "triage" | "index" | "execute" | "assess";
export type WorkSource = {
  type: "report" | "incident" | "service_ticket" | "action_proposal";
  id: string;
  version: number;
};
export interface EnqueueWorkInput {
  kind: WorkKind;
  source: WorkSource;
  idempotency_key: string;
  payload?: Record<string, string | number | boolean | null>;
  correlation_id: string;
}
export type WorkItem = {
  id: string;
  kind: WorkKind;
  source: WorkSource;
  payload: Record<string, unknown>;
  attempt: number;
  correlation_id: string;
};
export type WorkResult =
  | { status: "done"; detail?: string }
  | { status: "retry"; reason: string }
  | { status: "failed"; reason: string }
  | { status: "parked"; reason: string };
export type WorkHandler = (work: WorkItem) => Promise<WorkResult>;
export type WorkState = "queued" | "running" | "parked" | "done" | "failed";
export type WorkQueryClient = Pick<PoolClient, "query">;

/** Lease metadata is infrastructure-only, never authority supplied to a handler. */
export interface ClaimedWork {
  work: WorkItem;
  lease_token: string;
}

export class WorkInputError extends Error {
  readonly status: number;
  constructor(readonly code: "invalid_request" | "idempotency_conflict", message: string) {
    super(message);
    this.name = "WorkInputError";
    this.status = code === "idempotency_conflict" ? 409 : 400;
  }
}

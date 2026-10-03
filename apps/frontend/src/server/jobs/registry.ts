import type { WorkHandler, WorkKind } from "./types";

const handlers = new Map<WorkKind, WorkHandler>();

export function registerWorkHandler(kind: WorkKind, handler: WorkHandler): void {
  if (handlers.has(kind)) throw new Error(`A ${kind} work handler is already registered.`);
  handlers.set(kind, handler);
}

export function getWorkHandlers(): ReadonlyMap<WorkKind, WorkHandler> {
  return handlers;
}

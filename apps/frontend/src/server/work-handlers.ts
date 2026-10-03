import "server-only";

import { handleExecuteWork } from "@/server/actions/execute-handler";
import { registerWorkHandler } from "@/server/jobs";
import { handleTriageWork } from "@/server/incidents/triage-handler";

/**
 * Domain handlers for the worker. The worker process calls this once at startup; a kind
 * without a handler here stays parked by the worker rather than being reported as done.
 */
export function registerDomainWorkHandlers(): void {
  registerWorkHandler("triage", handleTriageWork);
  registerWorkHandler("execute", handleExecuteWork);
}

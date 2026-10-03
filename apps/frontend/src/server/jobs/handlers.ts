import { registerDomainWorkHandlers } from "@/server/work-handlers";

/**
 * Worker composition boundary. Import and register domain handlers here as
 * INCIDENTS/OFFICIAL/SEARCH land. Missing handlers are deliberately parked.
 * Do not replace a missing integration with a successful no-op handler.
 */
export function registerApplicationWorkHandlers(): void {
  // Incident-response handlers (workstream 2). `index` joins with SEARCH and stays parked until then.
  registerDomainWorkHandlers();
}

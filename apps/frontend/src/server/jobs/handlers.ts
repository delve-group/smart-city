import { registerDomainWorkHandlers } from "@/server/work-handlers";
import { handleIndexWork } from "@/server/search/index-handler";
import { registerWorkHandler } from "./registry";

/**
 * Worker composition boundary. Import and register domain handlers here as
 * INCIDENTS/OFFICIAL/SEARCH land. Missing handlers are deliberately parked.
 * Do not replace a missing integration with a successful no-op handler.
 */
export function registerApplicationWorkHandlers(): void {
  registerDomainWorkHandlers();
  registerWorkHandler("index", handleIndexWork);
}

import "server-only";
import { ConfigurationError } from "@/server/config";

export type DecisionProvider = "disabled" | "scaleway";

/** Explicit opt-in; disabled installations do not require model credentials. */
export function getDecisionProvider(): DecisionProvider {
  const provider = process.env.DECISION_PROVIDER ?? "disabled";
  if (provider !== "disabled" && provider !== "scaleway") {
    throw new ConfigurationError("Missing or invalid decision-provider environment variables: DECISION_PROVIDER.");
  }
  return provider;
}

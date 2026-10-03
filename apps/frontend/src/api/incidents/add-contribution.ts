import { contributionSchema } from "./types";
import { requestIncidents } from "./request-incidents";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockContribution } from "../mocks/public-incidents";
import { createGuestSession } from "../intake/create-guest-session";

/** The guest endpoint restores an existing resident; support identity is always server-owned. */
export async function addContribution(id: string) {
  await createGuestSession();
  if (USE_MOCKS) return fromMock(() => contributionSchema.parse(mockContribution(id)));
  return requestIncidents(`/api/incidents/${encodeURIComponent(id)}/contributions`, contributionSchema, { method: "POST" });
}

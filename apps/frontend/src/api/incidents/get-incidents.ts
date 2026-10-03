import { incidentPageSchema, publicIncidentSchema, type PublicIncident } from "./types";
import { requestIncidents } from "./request-incidents";
import { fromMock, USE_MOCKS } from "../mocks/use-mocks";
import { mockPublicIncidents } from "../mocks/public-incidents";

/** Read all pages for this PoC map; never silently display incomplete category counts. */
export async function getIncidents(signal?: AbortSignal): Promise<PublicIncident[]> {
  if (USE_MOCKS) return fromMock(() => mockPublicIncidents().map((incident) => publicIncidentSchema.parse(incident)));
  const incidents = new Map<string, PublicIncident>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageNumber = 0; pageNumber < 5; pageNumber += 1) {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await requestIncidents(`/api/incidents?${query}`, incidentPageSchema, { signal });
    for (const incident of page.items) incidents.set(incident.id, incident);
    if (!page.next_cursor) return [...incidents.values()];
    if (cursors.has(page.next_cursor)) throw new Error("Incident pagination could not complete. Retry the map refresh.");
    cursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }
  throw new Error("This demo map supports up to 1,000 incidents. The full list could not load.");
}

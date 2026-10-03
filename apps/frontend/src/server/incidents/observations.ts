import type { IncidentRow } from "./incidents";

/*
 * DEMO FIXTURE. A deterministic stand-in for a utility feed, keyed by fictional service area.
 * It is not a real power or water measurement. Areas without a configured feed report
 * "missing": absence of data is never a zero reading.
 */

export interface ServiceObservation {
  source: string;
  label: string;
  state: "current" | "stale" | "missing" | "contradictory";
  observed_at: string | null;
  retrieved_at: string;
  provenance: "demo";
  note: string | null;
}

const SOURCE = "Utility feed";
const FEEDS: Record<string, "current" | "stale" | "contradictory"> = {
  "demo-area-r3c3": "current",
  "demo-area-r3c2": "contradictory",
  "demo-area-r4c3": "stale",
};

export function getServiceObservations(
  incident: Pick<IncidentRow, "category_id" | "service_area_id" | "anchor_observed_at">,
  now = new Date(),
): ServiceObservation[] {
  const retrievedAt = now.toISOString();
  const feed = incident.category_id === "power" ? FEEDS[incident.service_area_id] : undefined;
  const anchor = incident.anchor_observed_at;
  if (!feed || !anchor) {
    return [{
      source: SOURCE, label: "No supply reading available", state: "missing", observed_at: null,
      retrieved_at: retrievedAt, provenance: "demo", note: "No feed is configured for this area and category.",
    }];
  }
  if (feed === "current") {
    return [{
      source: SOURCE, label: "Supply interrupted on the local feeder", state: "current",
      observed_at: new Date(anchor.getTime() + 2 * 60_000).toISOString(), retrieved_at: retrievedAt, provenance: "demo", note: null,
    }];
  }
  if (feed === "stale") {
    return [{
      source: SOURCE, label: "Last reading predates the reports", state: "stale",
      observed_at: new Date(anchor.getTime() - 3 * 3_600_000).toISOString(), retrieved_at: retrievedAt, provenance: "demo",
      note: "Too old to confirm or rule out the outage.",
    }];
  }
  return [{
    source: SOURCE, label: "Feeder reports normal supply", state: "contradictory",
    observed_at: new Date(anchor.getTime() + 5 * 60_000).toISOString(), retrieved_at: retrievedAt, provenance: "demo",
    note: "Conflicts with resident reports. Needs an official's judgement.",
  }];
}

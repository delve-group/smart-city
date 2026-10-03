import type { LocationCandidate } from "./types";

/** A resident-supplied pin carries no inferred street or building facts. */
export function mapPin(pin: { lat: number; lng: number }): LocationCandidate {
  return {
    candidate_id: null, source: "map_pin",
    label: "Pinned location (no confirmed street address)", ...pin,
    street: null, building_number: null, district: null, precision: "point",
  };
}

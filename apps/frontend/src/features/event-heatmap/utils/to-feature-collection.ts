import type { FeatureCollection, Point } from "geojson";
import type { CityEvent } from "@/api/events/types";
import { heatWeight } from "./heat-weight";

export type HeatPointProperties = { weight: number };

/** GeoJSON uses [lng, lat] order. */
export function toFeatureCollection(
  events: readonly CityEvent[],
): FeatureCollection<Point, HeatPointProperties> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      id: event.id,
      geometry: { type: "Point", coordinates: [event.location.lng, event.location.lat] },
      properties: { weight: heatWeight(event) },
    })),
  };
}

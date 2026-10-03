import type { FeatureCollection, Point } from "geojson";
import type { CityEvent, EventCategory } from "@/api/events/types";
import { heatWeight } from "./heat-weight";

export type EventPointProperties = { id: string; category: EventCategory; weight: number };

/** GeoJSON uses [lng, lat] order. */
export function toFeatureCollection(
  events: readonly CityEvent[],
): FeatureCollection<Point, EventPointProperties> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [event.location.lng, event.location.lat] },
      properties: { id: event.id, category: event.category, weight: heatWeight(event) },
    })),
  };
}

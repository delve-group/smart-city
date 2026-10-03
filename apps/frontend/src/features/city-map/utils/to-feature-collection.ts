import type { FeatureCollection, Point, Polygon } from "geojson";
import type { MapArea, MapPoint } from "../components/city-map-canvas/map-types";

export type MapPointProperties = { id: string; category: string; weight: number; muted: boolean };

/** GeoJSON uses [lng, lat] order. */
export function toFeatureCollection(points: readonly MapPoint[]): FeatureCollection<Point, MapPointProperties> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.location.lng, point.location.lat] },
      properties: { id: point.id, category: point.categoryId, weight: point.weight, muted: point.muted ?? false },
    })),
  };
}

const METERS_PER_DEGREE = 111_320;
const CIRCLE_STEPS = 64;

/** Circles as polygons; a flat approximation is exact enough for a few hundred metres. */
export function toAreaCollection(areas: readonly MapArea[]): FeatureCollection<Polygon, { id: string; category: string }> {
  return {
    type: "FeatureCollection",
    features: areas.map((area) => {
      const kx = METERS_PER_DEGREE * Math.cos((area.center.lat * Math.PI) / 180);
      const ring = Array.from({ length: CIRCLE_STEPS + 1 }, (_, step) => {
        const angle = (step / CIRCLE_STEPS) * 2 * Math.PI;
        return [
          area.center.lng + (area.radiusMeters * Math.cos(angle)) / kx,
          area.center.lat + (area.radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE,
        ];
      });
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { id: area.id, category: area.categoryId },
      };
    }),
  };
}

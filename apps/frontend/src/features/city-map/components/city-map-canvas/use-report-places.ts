import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapPoint } from "./map-types";
import { nearestOnLine, roadSegmentAround, type LngLat } from "../../utils/road-segment";
import { footprintAt, type Rings } from "../../utils/building-footprint";
import { BUILDING_LAYER_IDS, ROAD_LAYER_IDS } from "../../utils/style-base-map";

/** Where a report sits on the base map: inside a building, on a stretch of road, or neither. */
export type ReportPlace =
  | { kind: "building"; footprint: Rings; height: number; base: number }
  | { kind: "road"; line: LngLat[] }
  | { kind: "none" };

/** Buildings and roads are only drawn (and queryable) from this zoom. */
const MIN_ZOOM = 14.5;
/** A report this close to a road (metres) belongs to it. */
const ROAD_MAX_DISTANCE = 30;
/** Length of the highlighted stretch on each side of the report (metres). */
const ROAD_HALF_LENGTH = 35;
/** Categories that describe the street itself, so a nearby road wins over a building. */
const ROAD_FIRST = new Set(["roads", "transit"]);

function lines(feature: MapGeoJSONFeature): LngLat[][] {
  const { geometry } = feature;
  if (geometry.type === "LineString") return [geometry.coordinates as LngLat[]];
  if (geometry.type === "MultiLineString") return geometry.coordinates as LngLat[][];
  return [];
}

function polygons(feature: MapGeoJSONFeature): Rings[] {
  const { geometry } = feature;
  if (geometry.type === "Polygon") return [geometry.coordinates as Rings];
  if (geometry.type === "MultiPolygon") return geometry.coordinates as Rings[];
  return [];
}

function findBuilding(map: MapLibreMap, point: { x: number; y: number }, location: LngLat): ReportPlace | null {
  const layers = BUILDING_LAYER_IDS.filter((id) => map.getLayer(id));
  for (const feature of map.queryRenderedFeatures([[point.x - 4, point.y - 4], [point.x + 4, point.y + 4]], { layers })) {
    const footprint = footprintAt(location, polygons(feature));
    if (footprint) {
      const { render_height: height = 0, render_min_height: base = 0 } = feature.properties as Record<string, number>;
      return { kind: "building", footprint, height, base };
    }
  }
  return null;
}

function findRoad(map: MapLibreMap, point: { x: number; y: number }, location: LngLat): ReportPlace | null {
  const layers = ROAD_LAYER_IDS.filter((id) => map.getLayer(id));
  const box: [[number, number], [number, number]] = [[point.x - 30, point.y - 30], [point.x + 30, point.y + 30]];
  let best: { line: LngLat[]; distance: number } | null = null;
  for (const feature of map.queryRenderedFeatures(box, { layers })) {
    for (const line of lines(feature)) {
      const nearest = nearestOnLine(location, line);
      if (nearest && nearest.distance <= ROAD_MAX_DISTANCE && (!best || nearest.distance < best.distance)) {
        best = { line, distance: nearest.distance };
      }
    }
  }
  return best ? { kind: "road", line: roadSegmentAround(location, best.line, ROAD_HALF_LENGTH) } : null;
}

/**
 * Matches reports to the building they are in or the road they are on, from what the map has
 * rendered. Runs whenever the map settles at street zoom; results are kept per report.
 */
export function useReportPlaces(mapRef: RefObject<MapRef | null>, reports: readonly MapPoint[], mapReady: boolean) {
  const [places, setPlaces] = useState<ReadonlyMap<string, ReportPlace>>(new Map());
  const reportsRef = useRef(reports);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  // Resolve places for reports in view once the map settles.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapReady) return;
    const resolve = () => {
      if (map.getZoom() < MIN_ZOOM) return;
      const bounds = map.getBounds();
      setPlaces((current) => {
        let next: Map<string, ReportPlace> | null = null;
        for (const report of reportsRef.current) {
          if (current.has(report.id)) continue;
          const location: LngLat = [report.location.lng, report.location.lat];
          if (!bounds.contains(location)) continue;
          const point = map.project(location);
          const order = ROAD_FIRST.has(report.categoryId)
            ? [() => findRoad(map, point, location), () => findBuilding(map, point, location)]
            : [() => findBuilding(map, point, location), () => findRoad(map, point, location)];
          const place = order.reduce<ReportPlace | null>((found, find) => found ?? find(), null) ?? { kind: "none" };
          next ??= new Map(current);
          next.set(report.id, place);
        }
        return next ?? current;
      });
    };
    map.on("idle", resolve);
    return () => {
      map.off("idle", resolve);
    };
  }, [mapRef, mapReady]);

  return places;
}

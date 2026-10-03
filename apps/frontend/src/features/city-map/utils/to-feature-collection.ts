import type { FeatureCollection, Point } from "geojson";
import type { CityReport } from "@/api/reports/types";
import { heatWeight } from "./heat-weight";

export type ReportPointProperties = { id: string; category: string; weight: number };

/** GeoJSON uses [lng, lat] order. */
export function toFeatureCollection(reports: readonly CityReport[]): FeatureCollection<Point, ReportPointProperties> {
  return {
    type: "FeatureCollection",
    features: reports.map((report) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [report.location.lng, report.location.lat] },
      properties: { id: report.id, category: report.categoryId, weight: heatWeight(report) },
    })),
  };
}

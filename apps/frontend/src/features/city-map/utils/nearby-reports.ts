import type { CityReport } from "@/api/reports/types";

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: CityReport["location"], b: CityReport["location"]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export type NearbyReport = { report: CityReport; meters: number };

/** Other open reports within `radiusMeters`, closest first. */
export function nearbyReports(
  origin: CityReport,
  reports: readonly CityReport[],
  { radiusMeters = 600, limit = 5 } = {},
): NearbyReport[] {
  return reports
    .filter((report) => report.id !== origin.id && report.status !== "resolved")
    .map((report) => ({ report, meters: distanceMeters(origin.location, report.location) }))
    .filter(({ meters }) => meters <= radiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

/** "120 m", "1.2 km". */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toFixed(1)} km`;
}

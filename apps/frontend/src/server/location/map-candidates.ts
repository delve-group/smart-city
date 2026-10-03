import { photonFeatureSchema } from "@/api/photon/types";
import type { LocationCandidate } from "@/api/locations/types";
import { insideKrakow } from "@/shared/utils/krakow";

/** No guessed building facts or interpretation of geocoder rank as confidence. */
export function mapLocationCandidates(features: readonly unknown[]): LocationCandidate[] {
  const results: LocationCandidate[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const parsed = photonFeatureSchema.safeParse(feature);
    if (!parsed.success) continue;
    const { properties: p, geometry } = parsed.data;
    const [lng, lat] = geometry.coordinates;
    if (!insideKrakow({ lat, lng }) || !/^krak[oó]w$/i.test(p.city ?? "")) continue;
    const street = p.street ?? (p.osm_key === "highway" && p.osm_value !== "bus_stop" ? p.name ?? null : null);
    const building = street ? p.housenumber ?? null : null;
    const address = [street, building].filter(Boolean).join(" ");
    const name = p.osm_key !== "highway" || p.osm_value === "bus_stop" ? p.name : null;
    const label = ([name, address].filter(Boolean).join(" — ") || p.name || "").slice(0, 200);
    if (!label) continue;
    const id = `photon:${p.osm_type}:${p.osm_id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({
      candidate_id: id, source: "geocoder", label, lat, lng,
      street, building_number: building, district: p.district ?? p.locality ?? null,
      precision: building ? "building" : street ? "street" : "point",
    });
    if (results.length === 5) break;
  }
  return results;
}

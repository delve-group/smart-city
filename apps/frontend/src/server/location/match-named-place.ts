import { photonFeatureSchema } from "@/api/photon/types";
import { locationBoundsSchema, type LocationResolution } from "@/api/locations/types";
import { insideKrakow } from "@/shared/utils/krakow";
import { normalizeText } from "@/shared/utils/normalize-text";

/** Normalize the demo venue's Polish inflections without supplying geography or discarding stop names. */
export function locationQuery(address: string): string {
  return address.replace(/\btauron\s+aren(?:a|ie|y|ę|ą)(?=\s|$|[,.;])/giu, "Tauron Arena");
}

function placeName(value: string): string {
  return normalizeText(locationQuery(value)).replace(/\bkrak(?:ow|owie)\b/g, "")
    .replace(/^(?:w|na)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Exact names, not geocoder ranking, distinguish a venue from similarly named nearby stops. */
export function matchNamedPlace(features: readonly unknown[], address: string): NonNullable<LocationResolution["matched_place"]> | null {
  const query = placeName(address);
  if (!query) return null;
  const matches = new Map<string, NonNullable<LocationResolution["matched_place"]>>();
  for (const feature of features) {
    const parsed = photonFeatureSchema.safeParse(feature);
    if (!parsed.success) continue;
    const { properties: p, geometry: { coordinates: [lng, lat] } } = parsed.data;
    if (!p.name || placeName(p.name) !== query || !insideKrakow({ lat, lng }) || !/^krak[oó]w$/i.test(p.city ?? "")) continue;
    const candidate_id = `photon:${p.osm_type}:${p.osm_id}`;
    const bounds = p.extent ? locationBoundsSchema.safeParse({ west: p.extent[0], north: p.extent[1], east: p.extent[2], south: p.extent[3] }) : null;
    const usableBounds = bounds?.success && insideKrakow({ lat: bounds.data.south, lng: bounds.data.west })
      && insideKrakow({ lat: bounds.data.north, lng: bounds.data.east })
      && lng >= bounds.data.west && lng <= bounds.data.east && lat >= bounds.data.south && lat <= bounds.data.north;
    matches.set(candidate_id, { candidate_id, name: p.name.slice(0, 200), bounds: usableBounds ? bounds.data : null });
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}

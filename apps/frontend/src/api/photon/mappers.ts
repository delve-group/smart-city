import { photonFeatureSchema, type PhotonFeatureDto, type Place } from "./types";

export function mapPhotonFeature(dto: PhotonFeatureDto): Place {
  const { properties: p, geometry } = dto;
  const streetLine = [p.street, p.housenumber].filter(Boolean).join(" ");
  const name = p.name ?? (streetLine || "Unnamed place");
  const area = [p.name ? streetLine : undefined, p.district ?? p.locality, p.city]
    .filter((part): part is string => Boolean(part));
  const [lng, lat] = geometry.coordinates;
  return {
    id: `${p.osm_type}${p.osm_id}`,
    name,
    detail: area.join(", "),
    location: { lat, lng },
  };
}

/** Drops invalid features and duplicates (same name and detail, e.g. street segments). */
export function mapPhotonFeatures(items: readonly unknown[]): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const item of items) {
    const parsed = photonFeatureSchema.safeParse(item);
    if (!parsed.success) continue;
    const place = mapPhotonFeature(parsed.data);
    const key = `${place.name}|${place.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}

import { mapReverseAddress } from "./mappers";
import { photonFeatureSchema, photonResponseSchema, type ReverseAddress } from "./types";

const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse";

/** GET photon.komoot.io/reverse — the nearest address to a point, or null if none is found. */
export async function reverseGeocode(
  location: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<ReverseAddress | null> {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lng), limit: "1" });
  const response = await fetch(`${PHOTON_REVERSE_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Address lookup failed (${response.status}).`);

  const body = photonResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected address lookup response.");

  const feature = photonFeatureSchema.safeParse(body.data.features[0]);
  if (!feature.success) return null;
  return mapReverseAddress(feature.data.properties);
}

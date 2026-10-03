import { mapPhotonFeatures } from "./mappers";
import { photonResponseSchema, type Place } from "./types";

// Public Photon instance (komoot). Fair use only, no key; replace with a self-hosted
// instance or a commercial geocoder before production traffic.
const PHOTON_URL = "https://photon.komoot.io/api/";
/** Bias and limit results to Kraków. */
const KRAKOW = { lat: 50.0617, lng: 19.945, bbox: "19.79,49.96,20.22,50.13" };

/** GET photon.komoot.io/api */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  // Photon ranks a same-named village street above the city's landmark; naming the city fixes it.
  const q = /krak[oó]w/i.test(query) ? query : `${query} Kraków`;
  const params = new URLSearchParams({
    q,
    lat: String(KRAKOW.lat),
    lon: String(KRAKOW.lng),
    bbox: KRAKOW.bbox,
    limit: "8",
  });
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Place search failed (${response.status}).`);

  const body = photonResponseSchema.safeParse(await response.json());
  if (!body.success) throw new Error("Unexpected place search response.");

  return mapPhotonFeatures(body.data.features).slice(0, 5);
}

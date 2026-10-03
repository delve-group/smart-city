import "server-only";

import type { LocationResolution, ResolveLocationInput } from "@/api/locations/types";
import { mapPin } from "@/api/locations/mappers";
import { photonResponseSchema } from "@/api/photon/types";
import { insideKrakow, KRAKOW_BOUNDS } from "@/shared/utils/krakow";
import { mapLocationCandidates } from "./map-candidates";

const PHOTON_ORIGIN = "https://photon.komoot.io";

export async function resolveLocation(input: ResolveLocationInput, signal: AbortSignal): Promise<LocationResolution> {
  const pin = "pin" in input ? mapPin(input.pin) : null;
  if (pin && !insideKrakow(pin)) return { status: "outside_city", candidates: [], pin: null };
  const url = new URL(pin ? "/reverse" : "/api/", PHOTON_ORIGIN);
  url.searchParams.set("limit", "5");
  if (pin) {
    url.searchParams.set("lat", String(pin.lat));
    url.searchParams.set("lon", String(pin.lng));
    url.searchParams.set("radius", "0.1");
  } else if ("address" in input) {
    const q = /krak[oó]w/i.test(input.address) ? input.address : `${input.address} Kraków`;
    url.searchParams.set("q", q);
    url.searchParams.set("lat", "50.0617");
    url.searchParams.set("lon", "19.945");
    url.searchParams.set("bbox", [KRAKOW_BOUNDS.west, KRAKOW_BOUNDS.south, KRAKOW_BOUNDS.east, KRAKOW_BOUNDS.north].join(","));
  }
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error("Photon unavailable");
    const body = photonResponseSchema.parse(await response.json());
    const candidates = mapLocationCandidates(body.features);
    return {
      status: candidates.length > 1 ? "ambiguous" : candidates.length ? "candidates" : "unresolved",
      candidates, pin,
    };
  } catch {
    return { status: "unavailable", candidates: [], pin };
  }
}

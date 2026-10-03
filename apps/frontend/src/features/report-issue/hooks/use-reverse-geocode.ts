import { useEffect, useState } from "react";
import { reverseGeocode } from "@/api/photon/reverse-geocode";
import type { ReverseAddress } from "@/api/photon/types";

const DEBOUNCE_MS = 400;

export type ReverseGeocodeState =
  | { status: "idle" | "loading" }
  | { status: "done"; result: ReverseAddress | null }
  | { status: "error" };

/** The address under a point, looked up once the point stops moving. */
export function useReverseGeocode(location: { lat: number; lng: number } | null): ReverseGeocodeState {
  const [state, setState] = useState<ReverseGeocodeState>({ status: "idle" });
  const lat = location?.lat;
  const lng = location?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: "loading" });
      reverseGeocode({ lat, lng }, controller.signal)
        .then((result) => setState({ status: "done", result }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error" });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lat, lng]);

  return state;
}

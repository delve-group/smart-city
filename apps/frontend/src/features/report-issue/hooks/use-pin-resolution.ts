import { useEffect, useState } from "react";
import { resolveLocation } from "@/api/locations/resolve-location";
import type { LocationResolution } from "@/api/locations/types";

type PinState =
  | { status: "loading" }
  | { status: "done"; result: LocationResolution }
  | { status: "error" };

/** Only expose a reverse lookup for the current pin, including during debounce. */
export function usePinResolution(pin: { lat: number; lng: number }): PinState {
  const { lat, lng } = pin;
  const key = `${lat}:${lng}`;
  const [state, setState] = useState<{ key: string; value: PinState } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      resolveLocation({ city: "Kraków", pin: { lat, lng } }, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setState({ key, value: { status: "done", result } });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ key, value: { status: "error" } });
        });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [lat, lng, key]);
  return state?.key === key ? state.value : { status: "loading" };
}

import { useState } from "react";

type LocateState = { status: "idle" | "locating" } | { status: "error"; message: string };

/** One-shot browser geolocation, asked only when the user presses the button. */
export function useCurrentLocation(onFound: (location: { lat: number; lng: number }) => void) {
  const [state, setState] = useState<LocateState>({ status: "idle" });
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  function locate() {
    if (!supported) return;
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ status: "idle" });
        onFound({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) =>
        setState({
          status: "error",
          message:
            error.code === error.PERMISSION_DENIED
              ? "Location access is blocked. Move the map to the problem instead."
              : "Could not find your location. Move the map to the problem instead.",
        }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return { state, supported, locate };
}

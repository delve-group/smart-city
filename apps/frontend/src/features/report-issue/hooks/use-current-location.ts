import { useState } from "react";

export type LocateError = "denied" | "unavailable";

type LocateState = { status: "idle" | "locating" } | { status: "error"; code: LocateError };

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
          code: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return { state, supported, locate };
}

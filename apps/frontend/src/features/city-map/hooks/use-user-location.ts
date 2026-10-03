import { useEffect, useState } from "react";

export type UserLocation = { lat: number; lng: number };

/**
 * Follows the resident's position for the "you are here" dot. The browser asks for permission;
 * when it is refused or unavailable the dot simply does not appear. Allowing location later
 * (site settings) restarts the watch without a reload.
 */
export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let watchId: number | null = null;
    let status: PermissionStatus | null = null;
    let disposed = false;

    function start() {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(
        (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        // Keep the last known dot on a timeout; drop it only when access is refused.
        (error) => {
          if (error.code === error.PERMISSION_DENIED) setLocation(null);
        },
        { enableHighAccuracy: true, maximumAge: 30_000 },
      );
    }

    function onPermissionChange() {
      if (status?.state === "denied") setLocation(null);
      else start();
    }

    start();
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (disposed) return;
        status = result;
        status.addEventListener("change", onPermissionChange);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      status?.removeEventListener("change", onPermissionChange);
    };
  }, []);

  return location;
}

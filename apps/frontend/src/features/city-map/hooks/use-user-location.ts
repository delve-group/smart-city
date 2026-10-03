import { useEffect, useState } from "react";

export type UserLocation = { lat: number; lng: number };

/**
 * Follows the resident's position for the "you are here" dot. The browser asks for permission;
 * when it is refused or unavailable the dot simply does not appear.
 */
export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocation(null),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return location;
}

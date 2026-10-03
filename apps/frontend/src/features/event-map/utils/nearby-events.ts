import type { CityEvent } from "@/api/events/types";

const EARTH_RADIUS_M = 6_371_000;
/** Average walking pace, metres per minute. */
const WALKING_SPEED = 80;

export function distanceMeters(a: CityEvent["location"], b: CityEvent["location"]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export type NearbyEvent = { event: CityEvent; walkingMinutes: number };

/** Not-yet-ended events within walking distance, closest first. */
export function nearbyEvents(
  origin: CityEvent,
  events: readonly CityEvent[],
  now: number,
  { radiusMeters = 1000, limit = 4 } = {},
): NearbyEvent[] {
  return events
    .filter((event) => event.id !== origin.id && Date.parse(event.endsAt) > now)
    .map((event) => ({ event, meters: distanceMeters(origin.location, event.location) }))
    .filter(({ meters }) => meters <= radiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
    .map(({ event, meters }) => ({ event, walkingMinutes: Math.max(1, Math.round(meters / WALKING_SPEED)) }));
}

/** Existing PoC reporting bounds; this rectangle is not a municipal boundary. */
export const KRAKOW_BOUNDS = { south: 49.96, west: 19.79, north: 50.13, east: 20.22 };

export function insideKrakow({ lat, lng }: { lat: number; lng: number }): boolean {
  return lat >= KRAKOW_BOUNDS.south && lat <= KRAKOW_BOUNDS.north
    && lng >= KRAKOW_BOUNDS.west && lng <= KRAKOW_BOUNDS.east;
}

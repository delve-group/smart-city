import { KRAKOW_BOUNDS } from "@/api/reports/types";

/* Pure location helpers for matching. No geocoder, database or network. */

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

const STREET_PREFIX = /^(ulica|ul|aleja|aleje|al|osiedle|os|plac|pl|rondo|bulwar)\.?\s+/;

/** "ul. Józefa Dietla" and "Jozefa Dietla" are the same street; null stays unknown. */
export function streetKey(street: string | null): string | null {
  if (!street) return null;
  const key = street
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(STREET_PREFIX, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return key || null;
}

/** The building as a known asset: street plus number. Null when either fact is unknown. */
export function buildingKey(street: string | null, buildingNumber: string | null): string | null {
  const key = streetKey(street);
  const number = buildingNumber?.toLowerCase().replace(/\s+/g, "") ?? "";
  return key && number ? `${key}#${number}` : null;
}

const AREA_LAT_STEP = 0.03;
const AREA_LNG_STEP = 0.05;

/** DEMO CONFIGURATION: a fixed grid of fictional service areas over the Kraków reporting bounds. */
export function serviceAreaId(point: LatLng): string {
  const row = Math.max(0, Math.floor((point.lat - KRAKOW_BOUNDS.south) / AREA_LAT_STEP));
  const column = Math.max(0, Math.floor((point.lng - KRAKOW_BOUNDS.west) / AREA_LNG_STEP));
  return `demo-area-r${row}c${column}`;
}

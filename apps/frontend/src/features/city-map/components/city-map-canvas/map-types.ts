export type LatLng = { lat: number; lng: number };

/** One marker on the map. Screens map their own records (reports, incidents) to points. */
export type MapPoint = {
  id: string;
  categoryId: string;
  location: LatLng;
  /** 0.1–1: heatmap weight and marker size. */
  weight: number;
  /** Private or unreviewed: drawn as a hollow ring instead of a filled icon marker. */
  muted?: boolean;
};

/** A circle drawn under the markers, e.g. the matching radius of an incident. */
export type MapArea = {
  id: string;
  categoryId: string;
  center: LatLng;
  radiusMeters: number;
};

/** Where the map opens. */
export const INITIAL_VIEW = { longitude: 19.945, latitude: 50.0617, zoom: 12.3 };

export type MapView = typeof INITIAL_VIEW;

export type MapFocus = {
  /** Changes on every request, so focusing the same place twice still moves the map. */
  key: number;
  lng: number;
  lat: number;
  zoom?: number;
};

export type MapHover = { id: string; x: number; y: number };

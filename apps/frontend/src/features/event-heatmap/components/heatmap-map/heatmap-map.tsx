"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { CityEvent } from "@/api/events/types";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { readHeatmapColors } from "../../utils/read-heatmap-colors";
import { toFeatureCollection } from "../../utils/to-feature-collection";

// The only file that knows the map library. A Google Maps version implements the same props.
// Served from public/ by scripts/copy-maplibre-worker.mjs (runs before dev and build).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// OpenFreeMap: free OpenStreetMap tiles, no API key. MapLibre renders the attribution.
const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const KRAKOW_VIEW = { longitude: 19.945, latitude: 50.0617, zoom: 12 };

export type HeatmapMapProps = {
  events: readonly CityEvent[];
  /** Extra attribution, e.g. a demo-data notice. */
  attribution?: string;
};

export default function HeatmapMap({ events, attribution }: HeatmapMapProps) {
  const scheme = useColorScheme();
  // Re-read tokens when the theme changes; `scheme` is the cache key.
  const colors = useMemo(() => ({ scheme, ...readHeatmapColors() }), [scheme]);
  const data = useMemo(() => toFeatureCollection(events), [events]);

  return (
    <Map
      initialViewState={KRAKOW_VIEW}
      mapStyle={MAP_STYLE[colors.scheme]}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true, customAttribution: attribution }}
    >
      <Source id="events" type="geojson" data={data}>
        <Layer
          id="event-heat"
          type="heatmap"
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 15, 40],
            "heatmap-opacity": 0.8,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, colors.low,
              0.5, colors.mid,
              0.85, colors.high,
            ],
          }}
        />
      </Source>
    </Map>
  );
}

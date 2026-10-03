"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { MapPinFilled } from "@appica/icons-react";
import Map, { AttributionControl, Layer, Marker, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { CityReport } from "@/api/reports/types";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { readMapColors } from "../../utils/read-map-colors";
import { toFeatureCollection } from "../../utils/to-feature-collection";

// The only file that knows the map library. A Google Maps version implements the same props.
// Served from public/ by scripts/copy-maplibre-worker.mjs (runs before dev and build).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// OpenFreeMap: free OpenStreetMap tiles, no API key. MapLibre renders the attribution.
const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
/** Where the map opens. */
export const INITIAL_VIEW = { longitude: 19.945, latitude: 50.0617, zoom: 12.3 };
/** Invisible, larger circles that catch the pointer, so small points are easy to hit. */
const HIT_LAYER = "report-hit-area";
/** Zoom band where the heatmap hands over to individual points. */
const HANDOVER = { start: 12.5, end: 14 };

export type MapFocus = {
  /** Changes on every request, so focusing the same place twice still moves the map. */
  key: number;
  lng: number;
  lat: number;
  zoom?: number;
};

export type MapHover = { id: string; x: number; y: number };

export type CityMapCanvasProps = {
  reports: readonly CityReport[];
  /** API-defined category ids, in display order; colours come from theme tokens. */
  categoryIds: readonly string[];
  selectedId: string | null;
  hoveredId: string | null;
  focus: MapFocus | null;
  /** Screen space covered by floating UI, so fly-to centres in the visible area. */
  insets: { right: number; bottom: number };
  /** Location of a report being written, marked so the user keeps their bearings. */
  draftPin?: { lat: number; lng: number };
  /** False while the user is placing a pin: no hover or selection. */
  interactive: boolean;
  onHover: (hover: MapHover | null) => void;
  /** `point` is where the user clicked, in map pixels. */
  onSelect: (id: string | null, point?: { x: number; y: number }) => void;
  /** Fires when the camera stops moving, with the map centre. */
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  /** Extra attribution, e.g. a demo-data notice. */
  attribution?: string;
};

export default function CityMapCanvas({
  reports,
  categoryIds,
  selectedId,
  hoveredId,
  focus,
  insets,
  draftPin,
  interactive,
  onHover,
  onSelect,
  onCenterChange,
  attribution,
}: CityMapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  const scheme = useColorScheme();
  // Re-read tokens when the theme changes; `scheme` is the cache key.
  const colors = useMemo(() => ({ scheme, ...readMapColors(categoryIds) }), [scheme, categoryIds]);
  const data = useMemo(() => toFeatureCollection(reports), [reports]);

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({
      center: [focus.lng, focus.lat],
      zoom: Math.max(focus.zoom ?? 15, mapRef.current.getZoom()),
      // Offset, not padding: MapLibre keeps padding for later camera moves and tile coverage.
      offset: [-insets.right / 2, -insets.bottom / 2],
      duration: 900,
      essential: true,
    });
    // Only a new focus request should move the map, not inset changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // MapLibre's types cannot express a match built from a runtime list, hence the cast.
  const categoryColor = [
    "match",
    ["get", "category"],
    ...categoryIds.flatMap((id) => [id, colors.category[id] ?? colors.fallback]),
    colors.fallback,
  ] as unknown as ExpressionSpecification;
  const radius = (base: number): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    HANDOVER.start, ["+", base, ["*", ["get", "weight"], 4]],
    17, ["+", base * 2, ["*", ["get", "weight"], 12]],
  ];

  function handleMove(event: MapLayerMouseEvent) {
    const id = event.features?.[0]?.properties?.id;
    onHover(typeof id === "string" ? { id, x: event.point.x, y: event.point.y } : null);
  }

  function handleMoveEnd(event: ViewStateChangeEvent) {
    onCenterChange?.({ lat: event.viewState.latitude, lng: event.viewState.longitude });
  }

  function handleClick(event: MapLayerMouseEvent) {
    const id = event.features?.[0]?.properties?.id;
    onSelect(typeof id === "string" ? id : null, event.point);
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      mapStyle={MAP_STYLE[colors.scheme]}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      interactiveLayerIds={interactive ? [HIT_LAYER] : []}
      cursor={interactive && hoveredId ? "pointer" : undefined}
      onMouseMove={interactive ? handleMove : undefined}
      onMouseLeave={() => onHover(null)}
      onClick={interactive ? handleClick : undefined}
      onMoveEnd={handleMoveEnd}
    >
      {/* Bottom-left: the detail panel owns the right edge, and attribution must stay visible. */}
      <AttributionControl position="bottom-left" compact customAttribution={attribution} />
      {draftPin && (
        <Marker longitude={draftPin.lng} latitude={draftPin.lat} anchor="bottom">
          <MapPinFilled size={40} aria-hidden className="text-foreground-intense drop-shadow-sm" />
        </Marker>
      )}
      <Source id="reports" type="geojson" data={data}>
        <Layer
          id="report-heat"
          type="heatmap"
          maxzoom={17}
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 15, 40],
            // Fades to a faint glow as points take over, so density stays readable underneath.
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0.85, HANDOVER.end + 1, 0.2],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, colors.heat.low,
              0.5, colors.heat.mid,
              0.85, colors.heat.high,
            ],
          }}
        />
        <Layer
          id="report-selected-halo"
          type="circle"
          filter={["==", ["get", "id"], selectedId ?? ""]}
          paint={{
            "circle-radius": radius(9),
            "circle-color": categoryColor,
            "circle-opacity": 0.22,
            "circle-stroke-color": categoryColor,
            "circle-stroke-width": 1.5,
          }}
        />
        <Layer
          id="report-points"
          type="circle"
          minzoom={HANDOVER.start}
          paint={{
            "circle-radius": radius(4),
            "circle-color": categoryColor,
            "circle-stroke-color": colors.surface,
            "circle-stroke-width": ["case", ["==", ["get", "id"], hoveredId ?? ""], 3, 1.5],
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 1],
            "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 1],
          }}
        />
        <Layer
          id={HIT_LAYER}
          type="circle"
          minzoom={HANDOVER.start}
          paint={{ "circle-radius": 14, "circle-opacity": 0 }}
        />
      </Source>
    </Map>
  );
}

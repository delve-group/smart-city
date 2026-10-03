"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type ExpressionSpecification, type MapStyleImageMissingEvent } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPinFilled } from "@appica/icons-react";
import Map, { AttributionControl, Layer, Marker, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { CityReport } from "@/api/reports/types";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useMapStyle } from "../../hooks/use-map-style";
import { useReportIcons } from "../../hooks/use-report-icons";
import { MARKER_PIXEL_RATIO, MARKER_SIZE } from "../../utils/report-icon-svg";
import { readMapColors } from "../../utils/read-map-colors";
import { toFeatureCollection } from "../../utils/to-feature-collection";
import { useReportPlaces } from "./use-report-places";

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
/** Camera for the 3D view. */
const TILT = { pitch: 55, minZoom: 15.5 };
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
  /** Tilted view that shows buildings in 3D. */
  tilted?: boolean;
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
  tilted = false,
}: CityMapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  /** True while the camera moves (drag, zoom, fly-to); hover is meaningless then. */
  const movingRef = useRef(false);
  const scheme = useColorScheme();
  // Re-read tokens when the theme changes; `scheme` is the cache key.
  const colors = useMemo(() => ({ scheme, ...readMapColors(categoryIds) }), [scheme, categoryIds]);
  const data = useMemo(() => toFeatureCollection(reports), [reports]);
  const mapStyle = useMapStyle(MAP_STYLE, colors.scheme, colors.baseMap);
  /** Set once the map has loaded; until then the instance behind mapRef may not exist yet. */
  const [loaded, setLoaded] = useState(false);
  const places = useReportPlaces(mapRef, reports, loaded);
  // Shapes on the base map that carry a report: its building, or a stretch of its road.
  const { buildings, roadSegments } = useMemo(() => {
    const buildingFeatures: Feature<Polygon>[] = [];
    const roadFeatures: Feature<LineString>[] = [];
    for (const report of reports) {
      const place = places.get(report.id);
      if (place?.kind === "building") {
        buildingFeatures.push({
          type: "Feature",
          properties: { category: report.categoryId, height: place.height, base: place.base },
          geometry: { type: "Polygon", coordinates: place.footprint },
        });
      } else if (place?.kind === "road" && place.line.length > 1) {
        roadFeatures.push({
          type: "Feature",
          properties: { category: report.categoryId },
          geometry: { type: "LineString", coordinates: place.line },
        });
      }
    }
    return {
      buildings: { type: "FeatureCollection", features: buildingFeatures } satisfies FeatureCollection<Polygon>,
      roadSegments: { type: "FeatureCollection", features: roadFeatures } satisfies FeatureCollection<LineString>,
    };
  }, [reports, places]);
  const icons = useReportIcons(
    categoryIds,
    { category: colors.category, fallback: colors.fallback, ring: colors.surface, icon: colors.onCategory },
    colors.scheme,
  );
  const iconsRef = useRef(icons);

  /** Adds the current marker images the map does not have yet; MapLibre then redraws the affected tiles. */
  function registerIcons() {
    const map = mapRef.current?.getMap();
    const current = iconsRef.current;
    if (!map || !current) return;
    for (const [id, image] of current.images) {
      if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: MARKER_PIXEL_RATIO });
    }
  }

  useEffect(() => {
    iconsRef.current = icons;
    registerIcons();
  }, [icons]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: tilted ? TILT.pitch : 0,
      bearing: tilted ? map.getBearing() : 0,
      // Buildings rise from zoom 14; tilting further out would show nothing new.
      zoom: tilted ? Math.max(map.getZoom(), TILT.minZoom) : map.getZoom(),
      duration: 800,
    });
  }, [tilted]);

  // MapLibre's types cannot express a match built from a runtime list, hence the cast.
  // A match needs at least one case, so use the fallback colour until categories load.
  const categoryColor = (
    categoryIds.length === 0
      ? colors.fallback
      : [
          "match",
          ["get", "category"],
          ...categoryIds.flatMap((id) => [id, colors.category[id] ?? colors.fallback]),
          colors.fallback,
        ]
  ) as unknown as ExpressionSpecification;
  const isHovered: ExpressionSpecification = ["==", ["get", "id"], hoveredId ?? ""];
  /** Marker scale at street zoom and at close zoom; heavier reports are bigger. */
  const scale = (zoomed: boolean): ExpressionSpecification =>
    zoomed ? ["+", 1, ["*", ["get", "weight"], 0.4]] : ["+", 0.7, ["*", ["get", "weight"], 0.25]];
  /** Builds a zoom-interpolated value from the marker scale at both ends of the range. */
  const byScale = (fn: (scale: ExpressionSpecification) => ExpressionSpecification): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    HANDOVER.start, fn(scale(false)),
    17, fn(scale(true)),
  ];
  const markerRadius = (s: ExpressionSpecification): ExpressionSpecification => ["*", MARKER_SIZE / 2, s];

  function handleLoad() {
    const map = mapRef.current?.getMap();
    // A style reload (theme switch) drops images; add them back when a layer asks.
    map?.on("styleimagemissing", (event: MapStyleImageMissingEvent) => {
      const image = iconsRef.current?.images.get(event.id);
      if (image && !map.hasImage(event.id)) map.addImage(event.id, image, { pixelRatio: MARKER_PIXEL_RATIO });
    });
    registerIcons();
    setLoaded(true);

    // On narrow screens the expanded attribution runs under the bottom-right controls; start it collapsed.
    const container = mapRef.current?.getContainer();
    if (container && container.clientWidth < 768) {
      container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    }
  }

  function handleMoveStart() {
    movingRef.current = true;
    onHover(null);
  }

  function handleMove(event: MapLayerMouseEvent) {
    if (movingRef.current) return;
    const id = event.features?.[0]?.properties?.id;
    onHover(typeof id === "string" ? { id, x: event.point.x, y: event.point.y } : null);
  }

  function handleMoveEnd(event: ViewStateChangeEvent) {
    movingRef.current = false;
    onCenterChange?.({ lat: event.viewState.latitude, lng: event.viewState.longitude });
  }

  function handleClick(event: MapLayerMouseEvent) {
    const id = event.features?.[0]?.properties?.id;
    onSelect(typeof id === "string" ? id : null, event.point);
  }

  // Wait for the themed style rather than flashing the untouched one.
  if (!mapStyle) return null;

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      maxPitch={70}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      interactiveLayerIds={interactive ? [HIT_LAYER] : []}
      cursor={interactive && hoveredId ? "pointer" : undefined}
      onMouseMove={interactive ? handleMove : undefined}
      onMouseLeave={() => onHover(null)}
      onClick={interactive ? handleClick : undefined}
      onLoad={handleLoad}
      onMoveStart={handleMoveStart}
      onMoveEnd={handleMoveEnd}
    >
      {/* Bottom-left: the detail panel owns the right edge, and attribution must stay visible. */}
      <AttributionControl position="bottom-left" compact customAttribution={attribution} />
      {draftPin && (
        <Marker longitude={draftPin.lng} latitude={draftPin.lat} anchor="bottom">
          <MapPinFilled size={40} aria-hidden className="text-foreground-intense drop-shadow-sm" />
        </Marker>
      )}
      {/* Before the reports source, so buildings and stretches draw under the markers. */}
      <Source id="report-buildings" type="geojson" data={buildings}>
        <Layer
          id="report-building-shapes"
          type="fill-extrusion"
          minzoom={14}
          paint={{
            "fill-extrusion-color": categoryColor,
            // Same rise as the base 3D buildings, so the copy sits exactly over its building.
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["+", ["get", "height"], 0.3]],
            "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["get", "base"]],
            "fill-extrusion-opacity": 0.92,
          }}
        />
      </Source>
      <Source id="report-roads" type="geojson" data={roadSegments}>
        <Layer
          id="report-road-segments"
          type="line"
          minzoom={HANDOVER.start}
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": categoryColor,
            "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 4, 18, 18],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 0.8],
          }}
        />
      </Source>
      <Source id="reports" type="geojson" data={data}>
        <Layer
          id="report-heat"
          type="heatmap"
          maxzoom={17}
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 15, 40],
            // Gone at street level, where coloured buildings, road stretches and icons take over.
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0.85, HANDOVER.end + 1, 0],
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
            "circle-radius": byScale((s) => ["+", 5, markerRadius(s)]),
            "circle-color": categoryColor,
            "circle-opacity": 0.22,
            "circle-stroke-color": categoryColor,
            "circle-stroke-width": 1.5,
          }}
        />
        {icons ? (
          // Different keys: switching layer type needs a fresh layer, not an update.
          <Layer
            key="report-icons"
            id="report-points"
            type="symbol"
            minzoom={HANDOVER.start}
            layout={{
              "icon-image": ["concat", icons.prefix, ["get", "category"]],
              "icon-size": byScale((s) => ["*", ["case", isHovered, 1.2, 1], s]),
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              // Markers face the viewer in the tilted 3D view too.
              "icon-pitch-alignment": "viewport",
              "icon-rotation-alignment": "viewport",
              // Heavier reports draw on top.
              "symbol-sort-key": ["get", "weight"],
            }}
            paint={{
              "icon-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 1],
            }}
          />
        ) : (
          <Layer
            key="report-dots"
            id="report-points"
            type="circle"
            minzoom={HANDOVER.start}
            paint={{
              "circle-radius": byScale(markerRadius),
              "circle-color": categoryColor,
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 1.5,
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 1],
              "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], HANDOVER.start, 0, HANDOVER.end, 1],
            }}
          />
        )}
        <Layer
          id={HIT_LAYER}
          type="circle"
          minzoom={HANDOVER.start}
          paint={{ "circle-radius": byScale((s) => ["max", 12, markerRadius(s)]), "circle-opacity": 0 }}
        />
      </Source>
    </Map>
  );
}

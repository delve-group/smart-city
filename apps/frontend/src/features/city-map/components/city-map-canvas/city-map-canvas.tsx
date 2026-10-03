"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type ExpressionSpecification, type MapStyleImageMissingEvent } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPinFilled } from "@appica/icons-react";
import Map, { AttributionControl, Layer, Marker, Source, type MapLayerMouseEvent, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useMapStyle } from "../../hooks/use-map-style";
import { useReportIcons } from "../../hooks/use-report-icons";
import { MARKER_PIXEL_RATIO, MARKER_SIZE } from "../../utils/report-icon-svg";
import { readMapColors } from "../../utils/read-map-colors";
import { toAreaCollection, toFeatureCollection } from "../../utils/to-feature-collection";
import { INITIAL_VIEW, type MapArea, type MapFocus, type MapHover, type MapPoint, type MapView } from "./map-types";
import { useReportPlaces } from "./use-report-places";

// The only file that knows the map library. A Google Maps version implements the same props.
// Served from public/ by scripts/copy-maplibre-worker.mjs (runs before dev and build).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// OpenFreeMap: free OpenStreetMap tiles, no API key. MapLibre renders the attribution.
const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
/** Invisible, larger circles that catch the pointer, so small points are easy to hit. */
const HIT_LAYER = "report-hit-area";
/** Camera for the 3D view. */
const TILT = { pitch: 55, minZoom: 15.5 };
/** Zoom band where the heatmap hands over to individual points. */
const HANDOVER = { start: 12.5, end: 14 };

export type CityMapCanvasProps = {
  points: readonly MapPoint[];
  /** API-defined category ids, in display order; colours come from theme tokens. */
  categoryIds: readonly string[];
  /** Points drawn with a selection halo. */
  selectedIds: readonly string[];
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
  /** A resident camera gesture clears an address choice; programmatic focus does not. */
  onUserMove?: () => void;
  /** Extra attribution, e.g. a demo-data notice. */
  attribution?: string;
  /** Tilted view that shows buildings in 3D. */
  tilted?: boolean;
  /** Circles under the markers, e.g. an incident's matching radius. */
  areas?: readonly MapArea[];
  /** Density heatmap at city zoom; off for screens with only a handful of points. */
  heatmap?: boolean;
  initialView?: MapView;
};

const NO_AREAS: readonly MapArea[] = [];

export default function CityMapCanvas({
  points,
  categoryIds,
  selectedIds,
  hoveredId,
  focus,
  insets,
  draftPin,
  interactive,
  onHover,
  onSelect,
  onCenterChange,
  onUserMove,
  attribution,
  tilted = false,
  areas = NO_AREAS,
  heatmap = true,
  initialView = INITIAL_VIEW,
}: CityMapCanvasProps) {
  const mapRef = useRef<MapRef>(null);
  /** True while the camera moves (drag, zoom, fly-to); hover is meaningless then. */
  const movingRef = useRef(false);
  const scheme = useColorScheme();
  // Re-read tokens when the theme changes; `scheme` is the cache key.
  const colors = useMemo(() => ({ scheme, ...readMapColors(categoryIds) }), [scheme, categoryIds]);
  const data = useMemo(() => toFeatureCollection(points), [points]);
  const areaData = useMemo(() => toAreaCollection(areas), [areas]);
  const mapStyle = useMapStyle(MAP_STYLE, colors.scheme, colors.baseMap);
  /** Set once the map has loaded; until then the instance behind mapRef may not exist yet. */
  const [loaded, setLoaded] = useState(false);
  const places = useReportPlaces(mapRef, points, loaded);
  // Shapes on the base map that carry a report: its building, or a stretch of its road.
  const { buildings, roadSegments } = useMemo(() => {
    const buildingFeatures: Feature<Polygon>[] = [];
    const roadFeatures: Feature<LineString>[] = [];
    for (const point of points) {
      // A private or unreviewed report does not claim a building or street.
      if (point.muted) continue;
      const place = places.get(point.id);
      if (place?.kind === "building") {
        buildingFeatures.push({
          type: "Feature",
          properties: { category: point.categoryId, height: place.height, base: place.base },
          geometry: { type: "Polygon", coordinates: place.footprint },
        });
      } else if (place?.kind === "road" && place.line.length > 1) {
        roadFeatures.push({
          type: "Feature",
          properties: { category: point.categoryId },
          geometry: { type: "LineString", coordinates: place.line },
        });
      }
    }
    return {
      buildings: { type: "FeatureCollection", features: buildingFeatures } satisfies FeatureCollection<Polygon>,
      roadSegments: { type: "FeatureCollection", features: roadFeatures } satisfies FeatureCollection<LineString>,
    };
  }, [points, places]);
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
    // No style yet (first load, or effects re-run after navigating back): onLoad registers them.
    if (!map?.style || !current) return;
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
  const isMuted: ExpressionSpecification = ["==", ["get", "muted"], true];
  const isFilled: ExpressionSpecification = ["!=", ["get", "muted"], true];
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

  function handleMoveStart(event: ViewStateChangeEvent) {
    movingRef.current = true;
    onHover(null);
    if (event.originalEvent) onUserMove?.();
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
      initialViewState={initialView}
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
      <Source id="map-areas" type="geojson" data={areaData}>
        <Layer id="map-area-fill" type="fill" paint={{ "fill-color": categoryColor, "fill-opacity": 0.06 }} />
        <Layer
          id="map-area-outline"
          type="line"
          paint={{ "line-color": categoryColor, "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.8 }}
        />
      </Source>
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
        {heatmap && (
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
        )}
        <Layer
          id="report-selected-halo"
          type="circle"
          filter={["in", ["get", "id"], ["literal", selectedIds]]}
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
            filter={isFilled}
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
            filter={isFilled}
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
          id="report-muted-points"
          type="circle"
          filter={isMuted}
          minzoom={HANDOVER.start}
          paint={{
            "circle-radius": byScale((s) => ["*", 0.75, markerRadius(s)]),
            "circle-color": colors.surface,
            "circle-opacity": 0.9,
            "circle-stroke-color": categoryColor,
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.75,
          }}
        />
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

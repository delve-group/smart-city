import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

/** Base map colours, read from the `--map-*` theme tokens. */
export type BaseMapColors = {
  land: string;
  residential: string;
  park: string;
  building: string;
  water: string;
  roadMinor: string;
  roadMajor: string;
  roadMajorCasing: string;
  roadMotorway: string;
  roadMotorwayCasing: string;
};

/** OpenFreeMap (OpenMapTiles schema) layer ids in the positron and dark styles. */
const LAYER_ROLES: Record<string, keyof BaseMapColors> = {
  background: "land",
  road_area_pier: "land",
  road_pier: "land",
  landuse_residential: "residential",
  park: "park",
  landuse_park: "park",
  landcover_wood: "park",
  building: "building",
  water: "water",
  waterway: "water",
  highway_path: "roadMinor",
  highway_minor: "roadMinor",
  highway_major_inner: "roadMajor",
  highway_major_subtle: "roadMajor",
  highway_major_casing: "roadMajorCasing",
  highway_motorway_inner: "roadMotorway",
  highway_motorway_subtle: "roadMotorway",
  highway_motorway_bridge_inner: "roadMotorway",
  tunnel_motorway_inner: "roadMotorway",
  highway_motorway_casing: "roadMotorwayCasing",
  highway_motorway_bridge_casing: "roadMotorwayCasing",
  tunnel_motorway_casing: "roadMotorwayCasing",
};

function recolor(layer: LayerSpecification, color: string): LayerSpecification {
  switch (layer.type) {
    case "background":
      return { ...layer, paint: { ...layer.paint, "background-color": color } };
    case "fill":
      return { ...layer, paint: { ...layer.paint, "fill-color": color } };
    case "line":
      return { ...layer, paint: { ...layer.paint, "line-color": color, "line-opacity": 1 } };
    default:
      return layer;
  }
}

/** Returns a copy of the base style in the app's neutral palette. Unknown layers and empty tokens stay as they are. */
export function styleBaseMap(style: StyleSpecification, colors: BaseMapColors): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const role = LAYER_ROLES[layer.id];
      // A missing token must not break the map: keep the style's own colour.
      return role && colors[role] ? recolor(layer, colors[role]) : layer;
    }),
  };
}

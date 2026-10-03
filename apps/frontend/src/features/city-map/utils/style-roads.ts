import type { StyleSpecification } from "maplibre-gl";

export type RoadColors = {
  minor: string;
  major: string;
  majorCasing: string;
  motorway: string;
  motorwayCasing: string;
};

/** OpenFreeMap (OpenMapTiles schema) road layers, positron and dark styles. */
const ROAD_LAYERS: Record<string, keyof RoadColors> = {
  highway_minor: "minor",
  highway_major_inner: "major",
  highway_major_subtle: "major",
  highway_major_casing: "majorCasing",
  highway_motorway_inner: "motorway",
  highway_motorway_subtle: "motorway",
  highway_motorway_bridge_inner: "motorway",
  tunnel_motorway_inner: "motorway",
  highway_motorway_casing: "motorwayCasing",
  highway_motorway_bridge_casing: "motorwayCasing",
  tunnel_motorway_casing: "motorwayCasing",
};

/** Returns a copy of the base style with road colours from the theme. Unknown layers stay as they are. */
export function styleRoads(style: StyleSpecification, colors: RoadColors): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const role = ROAD_LAYERS[layer.id];
      if (!role || layer.type !== "line") return layer;
      return { ...layer, paint: { ...layer.paint, "line-color": colors[role], "line-opacity": 1 } };
    }),
  };
}

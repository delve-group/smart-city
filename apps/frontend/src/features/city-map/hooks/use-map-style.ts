import type { StyleSpecification } from "maplibre-gl";
import { useEffect, useState } from "react";
import type { ColorScheme } from "./use-color-scheme";
import { styleRoads, type RoadColors } from "../utils/style-roads";

const cache = new Map<string, Promise<StyleSpecification>>();

function loadStyle(url: string): Promise<StyleSpecification> {
  let style = cache.get(url);
  if (!style) {
    style = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Could not load the map style (${response.status}).`);
      return response.json() as Promise<StyleSpecification>;
    });
    style.catch(() => cache.delete(url));
    cache.set(url, style);
  }
  return style;
}

/**
 * The base map style for the colour scheme, with themed roads. Falls back to the plain
 * style URL if the JSON cannot be loaded, so the map still renders.
 */
export function useMapStyle(urls: Record<ColorScheme, string>, scheme: ColorScheme, roads: RoadColors) {
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const roadsKey = JSON.stringify(roads);

  useEffect(() => {
    let active = true;
    loadStyle(urls[scheme])
      .then((base) => active && setStyle(styleRoads(base, roads)))
      .catch(() => active && setStyle(urls[scheme]));
    return () => {
      active = false;
    };
    // `roadsKey` stands in for `roads`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls, scheme, roadsKey]);

  return style;
}

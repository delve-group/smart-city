import type { StyleSpecification } from "maplibre-gl";
import { useEffect, useState } from "react";
import type { ColorScheme } from "./use-color-scheme";
import { styleBaseMap, type BaseMapColors } from "../utils/style-base-map";

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
 * The base map style for the colour scheme, in the app palette. Falls back to the plain
 * style URL if the JSON cannot be loaded, so the map still renders.
 */
export function useMapStyle(urls: Record<ColorScheme, string>, scheme: ColorScheme, colors: BaseMapColors) {
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const colorsKey = JSON.stringify(colors);

  useEffect(() => {
    let active = true;
    loadStyle(urls[scheme])
      .then((base) => active && setStyle(styleBaseMap(base, colors)))
      .catch(() => active && setStyle(urls[scheme]));
    return () => {
      active = false;
    };
    // `colorsKey` stands in for `colors`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls, scheme, colorsKey]);

  return style;
}

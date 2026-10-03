import { createElement, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { categoryAppearance } from "@/shared/utils/category-appearance";
import { MARKER_ICON, reportMarkerSvg } from "../utils/report-icon-svg";

export type ReportIcons = {
  /** Image ids are `${prefix}${categoryId}`; the prefix changes with the colours. */
  prefix: string;
  images: ReadonlyMap<string, HTMLImageElement>;
};

type IconColors = { category: Record<string, string>; fallback: string; ring: string; icon: string };

async function loadImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

/**
 * Marker images (category colour + icon) for the map's symbol layer. Keeps the previous set
 * until a new one is ready, so the map never shows missing markers while the theme changes.
 */
export function useReportIcons(categoryIds: readonly string[], colors: IconColors, key: string): ReportIcons | null {
  const [icons, setIcons] = useState<ReportIcons | null>(null);
  const specKey = `${key}|${categoryIds.join(",")}`;

  useEffect(() => {
    let active = true;
    const prefix = `report-${key}-`;
    Promise.all(
      categoryIds.map(async (id) => {
        const markup = renderToStaticMarkup(
          createElement(categoryAppearance(id).Icon, {
            size: MARKER_ICON.size,
            x: MARKER_ICON.offset,
            y: MARKER_ICON.offset,
            // The icons stroke with currentColor.
            color: colors.icon,
          }),
        );
        const svg = reportMarkerSvg(markup, { fill: colors.category[id] || colors.fallback, ring: colors.ring });
        return [`${prefix}${id}`, await loadImage(svg)] as const;
      }),
    )
      .then((entries) => active && setIcons({ prefix, images: new Map(entries) }))
      .catch(() => {
        // Keep the previous markers; the points layer still shows them.
      });
    return () => {
      active = false;
    };
    // `specKey` covers the colours and category list, which are new objects on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey]);

  return icons;
}

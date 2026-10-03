/** Logical size of a report marker; images are rasterised at twice this for sharp screens. */
export const MARKER_SIZE = 28;
export const MARKER_PIXEL_RATIO = 2;
/** Where the icon sits inside the marker; render the icon <svg> with these as x, y and size. */
export const MARKER_ICON = { size: 16, offset: (MARKER_SIZE - 16) / 2 };

type MarkerColors = { fill: string; ring: string };

/**
 * A round marker in the category colour with the category icon in the middle.
 * `iconMarkup` is the icon's own positioned <svg>, nested inside the marker.
 */
export function reportMarkerSvg(iconMarkup: string, colors: MarkerColors): string {
  const size = MARKER_SIZE * MARKER_PIXEL_RATIO;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}">
  <circle cx="${MARKER_SIZE / 2}" cy="${MARKER_SIZE / 2}" r="${MARKER_SIZE / 2 - 1}" fill="${colors.fill}" stroke="${colors.ring}" stroke-width="1.5"/>
  ${iconMarkup}
</svg>`;
}

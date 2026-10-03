import { nearestOnLine, type LngLat } from "./road-segment";

/** A polygon as rings: the outer ring first, then holes. */
export type Rings = LngLat[][];

const METERS_PER_DEGREE = 111_320;
/** Pushes the copy's walls just outside the original's, so they do not flicker against each other. */
const OUTSET_METERS = 0.4;
/** A report this close to a footprint's edge (metres) still belongs to it, e.g. an entrance point. */
const EDGE_TOLERANCE = 6;

function inside(point: LngLat, ring: readonly LngLat[]): boolean {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      result = !result;
    }
  }
  return result;
}

function outset(rings: Rings): Rings {
  const outer = rings[0];
  const cx = outer.reduce((sum, [lng]) => sum + lng, 0) / outer.length;
  const cy = outer.reduce((sum, [, lat]) => sum + lat, 0) / outer.length;
  const kx = METERS_PER_DEGREE * Math.cos((cy * Math.PI) / 180);
  return rings.map((ring) =>
    ring.map(([lng, lat]): LngLat => {
      const dx = (lng - cx) * kx;
      const dy = (lat - cy) * METERS_PER_DEGREE;
      const length = Math.hypot(dx, dy) || 1;
      const scale = (length + OUTSET_METERS) / length;
      return [cx + (dx * scale) / kx, cy + (dy * scale) / METERS_PER_DEGREE];
    }),
  );
}

/**
 * The single building footprint at `point`. Map tiles merge neighbouring buildings into one
 * multipolygon, so pick the part that contains the point (or whose edge is within a few metres).
 */
export function footprintAt(point: LngLat, polygons: readonly Rings[]): Rings | null {
  const containing = polygons.find((rings) => rings[0] && inside(point, rings[0]));
  if (containing) return outset(containing);
  let best: { rings: Rings; distance: number } | null = null;
  for (const rings of polygons) {
    const nearest = rings[0] ? nearestOnLine(point, rings[0]) : null;
    if (nearest && nearest.distance <= EDGE_TOLERANCE && (!best || nearest.distance < best.distance)) {
      best = { rings, distance: nearest.distance };
    }
  }
  return best ? outset(best.rings) : null;
}

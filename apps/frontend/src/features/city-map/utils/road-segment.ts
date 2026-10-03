export type LngLat = [number, number];

const METERS_PER_DEGREE = 111_320;

type Projection = { toXY: (point: LngLat) => [number, number]; toLngLat: (xy: [number, number]) => LngLat };

/** Local flat projection in metres; accurate enough for a few hundred metres around `origin`. */
function localProjection(origin: LngLat): Projection {
  const kx = METERS_PER_DEGREE * Math.cos((origin[1] * Math.PI) / 180);
  return {
    toXY: ([lng, lat]) => [(lng - origin[0]) * kx, (lat - origin[1]) * METERS_PER_DEGREE],
    toLngLat: ([x, y]) => [origin[0] + x / kx, origin[1] + y / METERS_PER_DEGREE],
  };
}

/** Closest point of `line` to `point`: segment index, position along it (0–1) and distance in metres. */
export function nearestOnLine(point: LngLat, line: readonly LngLat[]) {
  const { toXY } = localProjection(point);
  let best: { index: number; t: number; distance: number } | null = null;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = toXY(line[i]);
    const [bx, by] = toXY(line[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
    const distance = Math.hypot(ax + t * dx, ay + t * dy);
    if (!best || distance < best.distance) best = { index: i, t, distance };
  }
  return best;
}

/** The stretch of `line` within `halfLength` metres (along the line) of the point closest to `point`. */
export function roadSegmentAround(point: LngLat, line: readonly LngLat[], halfLength: number): LngLat[] {
  const nearest = nearestOnLine(point, line);
  if (!nearest) return [];
  const { toXY, toLngLat } = localProjection(point);
  const xy = line.map(toXY);
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  const start = lerp(xy[nearest.index], xy[nearest.index + 1], nearest.t);

  /** Walks from `start` through the given vertices until `halfLength` is used up. */
  function walk(vertices: [number, number][]): [number, number][] {
    const out: [number, number][] = [];
    let previous = start;
    let left = halfLength;
    for (const vertex of vertices) {
      const step = Math.hypot(vertex[0] - previous[0], vertex[1] - previous[1]);
      if (step >= left) {
        out.push(lerp(previous, vertex, step === 0 ? 0 : left / step));
        return out;
      }
      out.push(vertex);
      left -= step;
      previous = vertex;
    }
    return out;
  }

  const backward = walk(xy.slice(0, nearest.index + 1).reverse());
  const forward = walk(xy.slice(nearest.index + 1));
  return [...backward.reverse(), start, ...forward].map(toLngLat);
}

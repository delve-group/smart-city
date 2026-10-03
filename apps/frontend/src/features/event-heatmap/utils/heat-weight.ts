import type { CityEvent } from "@/api/events/types";

const DEFAULT_WEIGHT = 0.2;
const MIN_WEIGHT = 0.1;
/** Attendance at which an event reaches full weight. */
const FULL_WEIGHT_ATTENDANCE = 10_000;

/** Log scale, so one stadium event does not drown out many local ones. Returns 0.1–1. */
export function heatWeight(event: Pick<CityEvent, "attendance">): number {
  if (event.attendance === undefined) return DEFAULT_WEIGHT;
  const scaled = Math.log10(event.attendance + 1) / Math.log10(FULL_WEIGHT_ATTENDANCE + 1);
  return Math.min(1, Math.max(MIN_WEIGHT, scaled));
}
